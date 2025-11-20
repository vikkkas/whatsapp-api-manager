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
} from 'lucide-react';
import { settingsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';

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
      return <Badge className="border border-slate-200 bg-slate-100 text-slate-600">UNSET</Badge>;
    }

    const variants: Record<string, string> = {
      GREEN: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      YELLOW: 'bg-amber-50 text-amber-700 border border-amber-200',
      RED: 'bg-rose-50 text-rose-700 border border-rose-200',
    };

    return (
      <Badge className={variants[quality] || 'border border-slate-200 bg-slate-100 text-slate-600'}>
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
      <div className="flex h-[70vh] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const isOnboarded = settings.isValid && settings.phoneNumberId && settings.accessToken;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute right-20 top-40 h-40 w-40 rounded-full bg-purple-200/50 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 py-10">
        <header className="rounded-[32px] border border-slate-200 bg-white/90 px-6 py-8 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Workspace Settings</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                WhatsApp Business Integration
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-600">
                Securely manage Meta credentials, test connectivity, and generate webhook tokens for a
                premium onboarding experience.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => window.open('https://developers.facebook.com/', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Meta Docs
              </Button>
              <Button
                className="bg-slate-900 text-white hover:bg-slate-800"
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
        </header>

        {!isOnboarded && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Configure your Meta credentials and webhook token to unlock messaging, analytics, and automation.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Connection Status</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {isOnboarded ? 'Live' : 'Not Connected'}
                </p>
              </div>
              {isOnboarded ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              ) : (
                <AlertCircle className="h-10 w-10 text-amber-500" />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Quality Rating</p>
              <div className="mt-2 flex items-center gap-2">
                {getQualityBadge(settings.qualityRating)}
                <span className="text-sm text-slate-500">Messaging health</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Messaging Limit</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {settings.messagingLimit?.replace('TIER_', 'Tier ') || 'Unverified'}
              </p>
              <p className="text-xs text-slate-500">Daily conversations allowed</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <Card className="border-slate-200 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Key className="h-5 w-5 text-slate-500" />
                WhatsApp Business API Credentials
              </CardTitle>
              <CardDescription className="text-slate-500">
                These values come from Meta Developers → WhatsApp → API Setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId" className="text-slate-700">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    Phone Number ID *
                  </div>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="phoneNumberId"
                    value={settings.phoneNumberId}
                    onChange={(e) => setSettings({ ...settings, phoneNumberId: e.target.value })}
                    placeholder="123456789012345"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => copyToClipboard(settings.phoneNumberId)}
                    disabled={!settings.phoneNumberId}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken" className="text-slate-700">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-slate-500" />
                    Access Token *
                  </div>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="accessToken"
                    type={showToken ? 'text' : 'password'}
                    value={settings.accessToken}
                    onChange={(e) => setSettings({ ...settings, accessToken: e.target.value })}
                    placeholder="EAABsbCS1iHgBA..."
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => setShowToken((prev) => !prev)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Use long-lived tokens and rotate them regularly for production workloads.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessAccountId" className="text-slate-700">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      Business Account ID
                    </div>
                  </Label>
                  <Input
                    id="businessAccountId"
                    value={settings.businessAccountId}
                    onChange={(e) => setSettings({ ...settings, businessAccountId: e.target.value })}
                    placeholder="1234567890"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Display Name (auto populated)</Label>
                  <Input
                    value={settings.displayName}
                    onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                    placeholder="Acme Corp Support"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-3">
                <Button
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
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
                <Button variant="ghost" className="text-slate-600 hover:bg-slate-100" onClick={fetchSettings}>
                  Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-b from-indigo-50 via-white to-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                Live Connection Snapshot
              </CardTitle>
              <CardDescription>
                Confidence indicators pulled from your latest validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm text-slate-500">Status</span>
                <span className="font-semibold text-slate-900">
                  {settings.isValid ? 'Verified' : 'Awaiting Validation'}
                </span>
              </div>
              <div className="space-y-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span>WhatsApp Number</span>
                  <span className="font-medium text-slate-900">{settings.phoneNumber || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Display Name</span>
                  <span className="font-medium text-slate-900">{settings.displayName || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Validated</span>
                  <span className="font-medium text-slate-900">
                    {settings.lastValidatedAt ? new Date(settings.lastValidatedAt).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
                <p className="mb-1 font-semibold text-indigo-600">Pro Tips</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-700">
                  <li>Validate after every credential rotation</li>
                  <li>Keep a service account for secure automation</li>
                  <li>Ensure your webhook token matches Meta</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Webhook className="h-5 w-5 text-slate-500" />
                Webhook Configuration
              </CardTitle>
              <CardDescription className="text-slate-500">
                Generate a verify token and use it inside Meta Developers when wiring the webhook
              </CardDescription>
            </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Webhook Status</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {webhookVerifiedAt ? 'Verified' : 'Awaiting Verification'}
                    </p>
                  </div>
                  <Badge className={webhookVerifiedAt ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {webhookVerifiedAt ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {webhookVerifiedAt
                    ? `Verified on ${new Date(webhookVerifiedAt).toLocaleString()}`
                    : 'Meta must ping your webhook URL with this verify token to complete the setup.'}
                </p>
                <Button
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
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
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">How verification works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600">
                    <li>Go to Meta Developers → WhatsApp → Configuration</li>
                    <li>Use the Webhook URL shown below</li>
                    <li>Paste the verify token you generated here</li>
                    <li>Click “Verify and Save” in Meta. You can also run “Test Verification”.</li>
                  </ol>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl" className="text-slate-700">
                    Webhook URL
                  </Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-domain.com/api/webhook"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Deploy behind HTTPS and paste into Meta Developers → WhatsApp → Configuration → Webhooks.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verifyToken" className="flex items-center gap-2 text-slate-700">
                  Verify Token
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
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
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      className="border-slate-200 text-slate-600 hover:bg-slate-50"
                      onClick={() => copyToClipboard(verifyToken)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button type="button" className="bg-slate-900 text-white hover:bg-slate-800" onClick={handleGenerateToken}>
                    Generate Token
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Enter this token when configuring the webhook inside Meta Developers. We store it securely per tenant
                  once you save.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Subscribed Events</p>
                  <p className="text-sm">Enable these topics in Meta:</p>
                </div>
              </div>
            </div>
              <ul className="grid gap-2 text-sm">
                {['messages', 'message_status', 'message_template_status_update', 'message_echoes'].map((event) => (
                  <li
                    key={event}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
                  >
                    <span>{event}</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700">
                <p className="font-semibold">Deployment Tip</p>
                <p>
                  Keep your verify token secret. Rotate it after every security review and share it only with teammates
                  who manage Meta Developers settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
