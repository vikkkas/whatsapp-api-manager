import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Key,
  Loader2,
  Phone,
  ShieldCheck,
  Sparkles,
  Webhook,
  Zap,
  Settings,
  RefreshCw
} from 'lucide-react';
import { settingsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface WABASettings {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  phoneNumber: string;
  displayName: string;
  qualityRating?: string;
  messagingLimit?: string;
  isValid: boolean;
  lastValidatedAt?: string;
}

const defaultSettings: WABASettings = {
  phoneNumberId: '',
  accessToken: '',
  businessAccountId: '',
  phoneNumber: '',
  displayName: '',
  qualityRating: undefined,
  messagingLimit: undefined,
  isValid: false,
  lastValidatedAt: undefined,
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [settings, setSettings] = useState<WABASettings>(defaultSettings);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [webhookVerifiedAt, setWebhookVerifiedAt] = useState<string | null>(null);
  const [isVerifyingWebhook, setIsVerifyingWebhook] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await settingsAPI.get();
      const wabaSettings = response.settings?.waba;
      if (wabaSettings) {
        setSettings({ ...defaultSettings, ...wabaSettings });
      } else {
        setSettings(defaultSettings);
      }
      setWebhookUrl(response.settings?.webhook?.url ?? '');
      setVerifyToken(response.settings?.webhook?.verifyToken ?? '');
      setWebhookVerifiedAt(response.settings?.webhook?.verifiedAt ?? null);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Unable to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTestConnection = async () => {
    if (!settings.phoneNumberId || !settings.accessToken) {
      toast.error('Please enter Phone Number ID and Access Token');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${settings.phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          phoneNumber: data.display_phone_number || prev.phoneNumber,
          displayName: data.verified_name || prev.displayName,
          qualityRating: data.quality_rating || prev.qualityRating,
          messagingLimit: data.messaging_limit_tier || prev.messagingLimit,
          isValid: true,
          lastValidatedAt: new Date().toISOString(),
        }));
        toast.success('Connection successful! API credentials are valid.');
      } else {
        const error = await response.json();
        toast.error(`Connection failed: ${error.error?.message || 'Invalid credentials'}`);
        setSettings((prev) => ({ ...prev, isValid: false }));
      }
    } catch (error) {
      toast.error('Connection test failed. Please check your credentials.');
      setSettings((prev) => ({ ...prev, isValid: false }));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    const wasOnboarded =
      Boolean(settings.lastValidatedAt) &&
      Boolean(settings.isValid) &&
      Boolean(settings.phoneNumberId) &&
      Boolean(settings.accessToken);

    if (!settings.phoneNumberId || !settings.accessToken) {
      toast.error('Phone Number ID and Access Token are required');
      return;
    }

    if (!settings.isValid) {
      toast.error('Please test the connection first');
      return;
    }

    setIsSaving(true);
    try {
      const response = await settingsAPI.update({
        waba: settings,
        webhookVerifyToken: verifyToken,
        webhookUrl,
      });
      toast.success('Settings saved successfully!');
      if (response.settings?.waba) {
        setSettings((prev) => ({ ...prev, ...response.settings.waba }));
      }
      if (response.settings?.webhook) {
        setWebhookUrl(response.settings.webhook.url ?? '');
        setVerifyToken(response.settings.webhook.verifyToken ?? '');
        setWebhookVerifiedAt(response.settings.webhook.verifiedAt ?? null);
      }

      if (!wasOnboarded) {
        setTimeout(() => {
          navigate('/inbox');
          toast.success('Setup complete! You can now start using the app.');
        }, 1200);
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getQualityBadge = (quality?: string) => {
    if (!quality) {
      return <Badge className="bg-gray-100 text-gray-600 border-none">UNSET</Badge>;
    }

    const variants: Record<string, string> = {
      GREEN: 'bg-green-100 text-green-700 border-none',
      YELLOW: 'bg-yellow-100 text-yellow-700 border-none',
      RED: 'bg-red-100 text-red-700 border-none',
    };

    return (
      <Badge className={variants[quality] || 'bg-gray-100 text-gray-600 border-none'}>
        {quality}
      </Badge>
    );
  };

  const handleGenerateToken = () => {
    const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const token = uuid.replace(/-/g, '').slice(0, 32);
    setVerifyToken(token);
    toast.success('New verify token generated. Save the settings to persist it.');
  };

  const handleVerifyWebhook = async () => {
    if (!verifyToken) {
      toast.error('Set a verify token before testing the webhook');
      return;
    }

    setIsVerifyingWebhook(true);
    try {
      const result = await settingsAPI.verifyWebhook(verifyToken);
      if (result.success) {
        toast.success('Webhook verified successfully!');
        await fetchSettings();
      } else {
        toast.error('Verification response did not match the expected challenge.');
      }
    } catch (error) {
      toast.error('Failed to verify webhook. Ensure your backend is reachable.');
    } finally {
      setIsVerifyingWebhook(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isOnboarded = settings.isValid && settings.phoneNumberId && settings.accessToken;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your WhatsApp Business API configuration.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="bg-white border-gray-200"
            onClick={() => window.open('https://developers.facebook.com/', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Meta Docs
          </Button>
          <Button
            className="bg-black text-white hover:bg-gray-800 shadow-lg"
            onClick={handleSaveSettings}
            disabled={isSaving || !settings.isValid}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {!isOnboarded && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-sm font-medium">
            Configure your Meta credentials and webhook token to unlock messaging, analytics, and automation.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Connection Status</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {isOnboarded ? 'Live' : 'Not Connected'}
              </p>
            </div>
            {isOnboarded ? (
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Quality Rating</p>
            <div className="mt-2 flex items-center gap-2">
              {getQualityBadge(settings.qualityRating)}
              <span className="text-xs text-gray-400">Messaging health</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Messaging Limit</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {settings.messagingLimit?.replace('TIER_', 'Tier ') || 'Unverified'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Daily conversations allowed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        {/* API Credentials */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Key className="h-5 w-5 text-gray-400" />
              WhatsApp Business API Credentials
            </CardTitle>
            <CardDescription>
              These values come from Meta Developers → WhatsApp → API Setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId" className="font-medium text-gray-700">
                Phone Number ID *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="phoneNumberId"
                  value={settings.phoneNumberId}
                  onChange={(e) => setSettings({ ...settings, phoneNumberId: e.target.value })}
                  placeholder="123456789012345"
                  className="font-mono bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
                <Button
                  variant="outline"
                  className="border-gray-200"
                  onClick={() => copyToClipboard(settings.phoneNumberId)}
                  disabled={!settings.phoneNumberId}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken" className="font-medium text-gray-700">
                Access Token *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="accessToken"
                  type={showToken ? 'text' : 'password'}
                  value={settings.accessToken}
                  onChange={(e) => setSettings({ ...settings, accessToken: e.target.value })}
                  placeholder="EAABsbCS1iHgBA..."
                  className="font-mono bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
                <Button
                  variant="outline"
                  className="border-gray-200"
                  onClick={() => setShowToken((prev) => !prev)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Use long-lived tokens and rotate them regularly for production workloads.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessAccountId" className="font-medium text-gray-700">
                  Business Account ID
                </Label>
                <Input
                  id="businessAccountId"
                  value={settings.businessAccountId}
                  onChange={(e) => setSettings({ ...settings, businessAccountId: e.target.value })}
                  placeholder="1234567890"
                  className="font-mono bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-gray-700">Display Name</Label>
                <Input
                  value={settings.displayName}
                  onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                  placeholder="Acme Corp Support"
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                className="bg-white border-gray-200"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button variant="ghost" className="text-gray-500 hover:text-gray-900" onClick={fetchSettings}>
                Reset Form
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Snapshot */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Live Snapshot
            </CardTitle>
            <CardDescription>
              Confidence indicators pulled from your latest validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
              <span className="text-sm text-gray-500">Status</span>
              <span className="font-semibold text-gray-900">
                {settings.isValid ? 'Verified' : 'Awaiting Validation'}
              </span>
            </div>
            <div className="space-y-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-gray-500">WhatsApp Number</span>
                <span className="font-medium text-gray-900">{settings.phoneNumber || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-gray-500">Display Name</span>
                <span className="font-medium text-gray-900">{settings.displayName || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Last Validated</span>
                <span className="font-medium text-gray-900">
                  {settings.lastValidatedAt ? new Date(settings.lastValidatedAt).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-blue-100/50 p-4 text-sm text-blue-700">
              <p className="font-semibold mb-2">Pro Tips</p>
              <ul className="list-disc list-inside space-y-1 text-xs opacity-80">
                <li>Validate after every credential rotation</li>
                <li>Keep a service account for secure automation</li>
                <li>Ensure your webhook token matches Meta</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Configuration */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Webhook className="h-5 w-5 text-gray-400" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Generate a verify token and use it inside Meta Developers when wiring the webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Webhook Status</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {webhookVerifiedAt ? 'Verified' : 'Awaiting Verification'}
                  </p>
                </div>
                <Badge className={webhookVerifiedAt ? 'bg-green-100 text-green-700 border-none' : 'bg-amber-100 text-amber-700 border-none'}>
                  {webhookVerifiedAt ? 'Verified' : 'Pending'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {webhookVerifiedAt
                  ? `Verified on ${new Date(webhookVerifiedAt).toLocaleString()}`
                  : 'Meta must ping your webhook URL with this verify token to complete the setup.'}
              </p>
              <Button
                variant="outline"
                className="bg-white border-gray-200 w-full"
                onClick={handleVerifyWebhook}
                disabled={isVerifyingWebhook || !verifyToken}
              >
                {isVerifyingWebhook ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Test Verification
                  </>
                )}
              </Button>
              <div className="pt-4 border-t border-gray-200">
                <p className="mb-2 text-xs font-bold text-gray-900 uppercase tracking-wide">How verification works:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600">
                  <li>Go to Meta Developers → WhatsApp → Configuration</li>
                  <li>Use the Webhook URL shown below</li>
                  <li>Paste the verify token you generated here</li>
                  <li>Click “Verify and Save” in Meta. You can also run “Test Verification”.</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl" className="font-medium text-gray-700">
                Webhook URL
              </Label>
              <div className="flex gap-2">
                <Input
                  id="webhookUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/api/webhook"
                  className="font-mono bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
                <Button
                  variant="outline"
                  className="border-gray-200"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Deploy behind HTTPS and paste into Meta Developers → WhatsApp → Configuration → Webhooks.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verifyToken" className="flex items-center gap-2 font-medium text-gray-700">
                Verify Token
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-500 font-bold">
                  Required
                </span>
              </Label>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex flex-1 gap-2">
                  <Input
                    id="verifyToken"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    placeholder="secure-verify-token"
                    className="font-mono bg-gray-50 border-gray-200 focus:bg-white transition-all"
                  />
                  <Button
                    variant="outline"
                    className="border-gray-200"
                    onClick={() => copyToClipboard(verifyToken)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button type="button" className="bg-black text-white hover:bg-gray-800" onClick={handleGenerateToken}>
                  Generate Token
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Enter this token when configuring the webhook inside Meta Developers. We store it securely per tenant
                once you save.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Subscribed Events</p>
                  <p className="text-xs text-gray-500">Enable these topics in Meta:</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['messages', 'message_status', 'message_template_status_update', 'message_echoes'].map((event) => (
                  <div
                    key={event}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700"
                  >
                    <span className="truncate mr-2" title={event}>{event}</span>
                    <ShieldCheck className="h-3 w-3 text-green-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
