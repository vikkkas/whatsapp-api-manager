import { useState, useEffect } from "react";
import { Send, CheckCircle2, XCircle, Loader2, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { messageAPI, settingsAPI } from "@/lib/api";
import { formatPhoneNumberDisplay, getCountryFlag, normalizePhoneNumber } from "@/lib/phoneUtils";

interface SentMessageDetails {
  to: string;
  originalTo: string;
  messageId: string;
  timestamp: string;
}

export default function SendMessage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sentMessageDetails, setSentMessageDetails] = useState<SentMessageDetails | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsAPI.get();
        setPhoneNumberId(response.settings?.waba?.phoneNumberId || "");
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    };
    fetchSettings();
  }, []);

  const formatPhoneNumber = (phone: string) => {
    return normalizePhoneNumber(phone);
  };

  const validatePhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    
    // Indian number: 10 digits starting with 6-9, or 12 digits starting with 91
    if ((cleaned.length === 10 && /^[6-9]/.test(cleaned)) || 
        (cleaned.length === 12 && cleaned.startsWith('91') && /^91[6-9]/.test(cleaned))) {
      return true;
    }
    
    // US number: 10 digits starting with 2-9, or 11 digits starting with 1
    if ((cleaned.length === 10 && /^[2-9]/.test(cleaned)) || 
        (cleaned.length === 11 && cleaned.startsWith('1'))) {
      return true;
    }
    
    // Other international numbers (11-15 digits)
    return cleaned.length >= 11 && cleaned.length <= 15;
  };

  const handleSendMessage = async () => {
    if (!phoneNumber.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error("Please enter a valid phone number (10-15 digits)");
      return;
    }

    setApiStatus("loading");
    setSentMessageDetails(null);

    try {
      if (!phoneNumberId) {
        throw new Error("Configure your WhatsApp phone number in Settings first.");
      }
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const response = await messageAPI.send({
        phoneNumberId,
        to: formattedPhone,
        type: 'text',
        text: message.trim(),
      });

      setApiStatus("success");
      setSentMessageDetails({
        to: formattedPhone,
        originalTo: phoneNumber,
        messageId: response.messageId || 'N/A',
        timestamp: new Date().toISOString()
      });
      
      toast.success("Message sent successfully!");
      
      // Reset form after a delay
      setTimeout(() => {
        setPhoneNumber("");
        setMessage("");
        setApiStatus("idle");
        setSentMessageDetails(null);
      }, 5000);
      
    } catch (error: unknown) {
      setApiStatus("error");
      console.error('Send message error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Send Message</h2>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>New Message</CardTitle>
            <CardDescription>Send a WhatsApp message to any phone number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="9876543210 (India) or 2345678900 (US)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                  disabled={apiStatus === "loading"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter 10-digit number: Indian (6-9xxxxxxxx) or US (2-9xxxxxxxx). Country code will be added automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={apiStatus === "loading"}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/1000 characters
              </p>
            </div>

            <Button 
              onClick={handleSendMessage} 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={apiStatus === "loading" || !phoneNumber.trim() || !message.trim()}
            >
              {apiStatus === "loading" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {apiStatus === "loading" ? "Sending..." : "Send Message"}
            </Button>
          </CardContent>
        </Card>

        {/* API Status Card */}
        {(apiStatus === "success" || apiStatus === "error") && (
          <Card className={apiStatus === "success" ? "border-green-500" : "border-red-500"}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {apiStatus === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <CardTitle className="text-lg">
                  {apiStatus === "success" ? "Message Sent" : "Error"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {apiStatus === "success"
                  ? "Your message has been sent successfully via WhatsApp Business API."
                  : "Failed to send message. Please check your API credentials and try again."}
              </p>
              {apiStatus === "success" && sentMessageDetails && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getCountryFlag(sentMessageDetails.to)}</span>
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">To:</span> {formatPhoneNumberDisplay(sentMessageDetails.to)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-muted-foreground">Original Input:</span> {sentMessageDetails.originalTo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-muted-foreground">Message ID:</span> {sentMessageDetails.messageId}
                  </p>
                  <p className="text-xs font-mono mt-1">
                    <span className="text-muted-foreground">Timestamp:</span>{" "}
                    {new Date(sentMessageDetails.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
