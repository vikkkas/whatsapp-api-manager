import { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Phone, 
  Webhook, 
  Building2,
  Copy,
  Eye,
  EyeOff,
  TestTube,
  Loader2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { settingsAPI } from '../lib/api';

import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

const SettingsPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [settings, setSettings] = useState<WABASettings>({
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    phoneNumber: '',
    displayName: '',
    qualityRating: undefined,
    messagingLimit: undefined,
    isValid: false,
    lastValidatedAt: undefined,
  });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await settingsAPI.get();
      if (response.settings?.waba) {
        setSettings(response.settings.waba);
        setWebhookUrl(response.settings.webhook?.url || '');
        setVerifyToken(response.settings.webhook?.verifyToken || '');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
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
      // Test the connection by making a request to Meta API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${settings.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          phoneNumber: data.display_phone_number || prev.phoneNumber,
          displayName: data.verified_name || prev.displayName,
          qualityRating: data.quality_rating || prev.qualityRating,
          isValid: true,
          lastValidatedAt: new Date().toISOString(),
        }));
        toast.success('Connection successful! API credentials are valid.');
      } else {
        const error = await response.json();
        toast.error(`Connection failed: ${error.error?.message || 'Invalid credentials'}`);
        setSettings(prev => ({ ...prev, isValid: false }));
      }
    } catch (error) {
      toast.error('Connection test failed. Please check your credentials.');
      setSettings(prev => ({ ...prev, isValid: false }));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
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
      await settingsAPI.update({
        waba: settings,
        webhookUrl,
        webhookVerifyToken: verifyToken,
      });
      toast.success('Settings saved successfully!');
      
      // If this is first time setup, redirect to inbox
      if (!settings.lastValidatedAt) {
        setTimeout(() => {
          navigate('/inbox');
          toast.success('Setup complete! You can now start using the app.');
        }, 1500);
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getQualityBadge = (quality?: string) => {
    if (!quality) return null;
    const colors = {
      GREEN: 'bg-green-500',
      YELLOW: 'bg-yellow-500',
      RED: 'bg-red-500',
    };
    return (
      <Badge className={colors[quality as keyof typeof colors] || 'bg-gray-500'}>
        {quality}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isOnboarded = settings.isValid && settings.phoneNumberId && settings.accessToken;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your WhatsApp Business API credentials and webhook settings
        </p>
      </div>

      {/* Onboarding Alert */}
      {!isOnboarded && (
        <Alert className="mb-6 border-blue-500 bg-blue-50">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Welcome!</strong> Please configure your WhatsApp Business API credentials below to get started.
            You won't be able to access other features until your API is properly configured.
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.isValid ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-semibold text-lg">Connected</p>
                    <p className="text-sm text-gray-600">
                      Your WhatsApp Business API is active
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-semibold text-lg">Not Connected</p>
                    <p className="text-sm text-gray-600">
                      Please configure your API credentials below
                    </p>
                  </div>
                </>
              )}
            </div>
            {settings.isValid && (
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Quality Rating:</span>
                  {getQualityBadge(settings.qualityRating)}
                </div>
                {settings.messagingLimit && (
                  <p className="text-sm text-gray-600 mt-1">
                    Limit: {settings.messagingLimit.replace('TIER_', '')} msgs/day
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="waba" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="waba">WhatsApp Business API</TabsTrigger>
          <TabsTrigger value="webhook">Webhook Configuration</TabsTrigger>
        </TabsList>

        {/* WABA Settings Tab */}
        <TabsContent value="waba" className="space-y-6">
          {/* Getting Started Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Follow these steps to set up your WhatsApp Business API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    Go to{' '}
                    <a
                      href="https://developers.facebook.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Meta Developers Console
                    </a>
                  </li>
                  <li>Create or select your WhatsApp Business App</li>
                  <li>Navigate to WhatsApp → API Setup</li>
                  <li>Copy your Phone Number ID and Access Token</li>
                  <li>Paste them below and click "Test Connection"</li>
                  <li>Once validated, click "Save Settings"</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* API Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Credentials
              </CardTitle>
              <CardDescription>
                Your WhatsApp Business API authentication credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone Number ID */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number ID *
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
                    size="sm"
                    onClick={() => copyToClipboard(settings.phoneNumberId)}
                    disabled={!settings.phoneNumberId}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Found in Meta Developers → WhatsApp → API Setup
                </p>
              </div>

              {/* Access Token */}
              <div className="space-y-2">
                <Label htmlFor="accessToken" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Access Token *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="accessToken"
                    type={showToken ? 'text' : 'password'}
                    value={settings.accessToken}
                    onChange={(e) => setSettings({ ...settings, accessToken: e.target.value })}
                    placeholder="EAAxxxxxxxxxxxxxxxxxx"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Generate a permanent token in Meta Developers → App Settings
                </p>
              </div>

              {/* Business Account ID */}
              <div className="space-y-2">
                <Label htmlFor="businessAccountId" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Business Account ID (Optional)
                </Label>
                <Input
                  id="businessAccountId"
                  value={settings.businessAccountId}
                  onChange={(e) => setSettings({ ...settings, businessAccountId: e.target.value })}
                  placeholder="1234567890123456"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  Your WhatsApp Business Account ID (WABA ID)
                </p>
              </div>

              {/* Test Connection Button */}
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !settings.phoneNumberId || !settings.accessToken}
                className="w-full"
                variant="outline"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Connection Details (shown after successful test) */}
          {settings.isValid && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900">Connection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {settings.phoneNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-green-800">Phone Number:</span>
                    <span className="text-sm font-medium text-green-900">
                      {settings.phoneNumber}
                    </span>
                  </div>
                )}
                {settings.displayName && (
                  <div className="flex justify-between">
                    <span className="text-sm text-green-800">Display Name:</span>
                    <span className="text-sm font-medium text-green-900">
                      {settings.displayName}
                    </span>
                  </div>
                )}
                {settings.lastValidatedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-green-800">Last Validated:</span>
                    <span className="text-sm font-medium text-green-900">
                      {new Date(settings.lastValidatedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={fetchSettings}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving || !settings.isValid}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure webhook to receive real-time message updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-domain.com/api/webhook"
                    className="font-mono"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Use this URL in Meta Developers → WhatsApp → Configuration → Webhooks
                </p>
              </div>

              {/* Verify Token */}
              <div className="space-y-2">
                <Label htmlFor="verifyToken">Verify Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="verifyToken"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    placeholder="your_verify_token"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(verifyToken)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter this token when configuring webhook in Meta Developers
                </p>
              </div>

              {/* Webhook Events */}
              <div className="space-y-2">
                <Label>Subscribed Events</Label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Make sure to subscribe to these webhook fields:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
                    <li>messages</li>
                    <li>message_status</li>
                    <li>message_template_status_update</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
