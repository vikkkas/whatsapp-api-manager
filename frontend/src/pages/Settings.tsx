import { useState } from "react";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function Settings() {
  const [token, setToken] = useState("EAAxxxxxxxxxx");
  const [phoneNumberId, setPhoneNumberId] = useState("123456789012345");
  const [webhookUrl, setWebhookUrl] = useState("https://your-domain.com/webhook");
  const [isConnected, setIsConnected] = useState(true);

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully!");
    setIsConnected(true);
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Settings</h2>

      <div className="space-y-6">
        {/* Connection Status */}
        <Alert className={isConnected ? "border-success" : "border-warning"}>
          {isConnected ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-warning" />
          )}
          <AlertDescription>
            {isConnected
              ? "WhatsApp API is connected and active"
              : "WhatsApp API connection needs configuration"}
          </AlertDescription>
        </Alert>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp API Configuration</CardTitle>
            <CardDescription>
              Configure your WhatsApp Business API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Enter your WhatsApp access token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get this from your Facebook App Dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-number-id">Phone Number ID</Label>
              <Input
                id="phone-number-id"
                placeholder="Enter your phone number ID"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Found in your WhatsApp Business Account settings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-domain.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL where WhatsApp will send incoming messages
              </p>
            </div>

            <Button onClick={handleSaveSettings} className="w-full bg-primary hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* API Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>API Connection Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-lg font-semibold text-success">Connected</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">API Version</p>
                <p className="text-lg font-semibold">v18.0</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Messages Today</p>
                <p className="text-lg font-semibold">234</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Rate Limit</p>
                <p className="text-lg font-semibold">1000/hour</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Need help? Check out the{" "}
                <a href="#" className="text-primary hover:underline">
                  WhatsApp Business API documentation
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
