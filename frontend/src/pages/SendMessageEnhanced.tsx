import { useState, useRef, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Loader2, 
  Send, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Music, 
  X,
  AlertCircle,
  Check
} from 'lucide-react';
import { messageAPI, settingsAPI } from '../lib/api';
import { toast } from 'sonner';

const SendMessageEnhanced = () => {
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'audio' | 'document'>('text');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes: Record<string, string[]> = {
      image: ['image/jpeg', 'image/png', 'image/gif'],
      video: ['video/mp4', 'video/3gpp'],
      audio: ['audio/mpeg', 'audio/ogg', 'audio/amr'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };

    const allowedTypes = validTypes[messageType] || [];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError(`Invalid file type for ${messageType}. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (16MB limit for WhatsApp)
    const maxSize = 16 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size exceeds 16MB limit');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Create preview for images and videos
    if (messageType === 'image' || messageType === 'video') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate phone number
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error('Please enter a valid phone number');
      }

      // Format phone number (add + if not present)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      let mediaUrl = '';

      // Upload file if present
      if (file && messageType !== 'text') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', messageType);

        // TODO: Implement file upload endpoint
        // const uploadResponse = await fetch('/api/media/upload', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        //   },
        //   body: formData
        // });
        // const uploadData = await uploadResponse.json();
        // mediaUrl = uploadData.url;

        // For now, use a placeholder
        mediaUrl = `https://example.com/media/${file.name}`;
      }

      // Send message
      if (!phoneNumberId) {
        throw new Error('Configure your WhatsApp phone number in Settings first.');
      }

      const messageData: any = {
        phoneNumberId,
        to: formattedPhone,
        type: messageType,
      };

      if (messageType === 'text') {
        messageData.text = message;
      } else {
        messageData.mediaUrl = mediaUrl;
        messageData.caption = caption || undefined;
        if (messageType === 'document') {
          messageData.filename = file?.name;
        }
      }

      await messageAPI.send(messageData);

      setSuccess(true);
      toast.success('Message sent successfully!');

      // Reset form
      setPhoneNumber('');
      setMessage('');
      setCaption('');
      handleRemoveFile();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = () => {
    switch (messageType) {
      case 'image': return <ImageIcon className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return null;
    }
  };

  const getAcceptedTypes = () => {
    switch (messageType) {
      case 'image': return 'image/jpeg,image/png,image/gif';
      case 'video': return 'video/mp4,video/3gpp';
      case 'audio': return 'audio/mpeg,audio/ogg,audio/amr';
      case 'document': return 'application/pdf,.doc,.docx';
      default: return '';
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Message
            </CardTitle>
            <CardDescription>
              Send text, images, videos, or documents to WhatsApp contacts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Success Alert */}
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Message sent successfully!
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Recipient Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-gray-500">
                  Include country code (e.g., +1 for US, +91 for India)
                </p>
              </div>

              {/* Message Type Tabs */}
              <Tabs value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="image">Image</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                  <TabsTrigger value="audio">Audio</TabsTrigger>
                  <TabsTrigger value="document">Document</TabsTrigger>
                </TabsList>

                {/* Text Message */}
                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      placeholder="Enter your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isLoading}
                      required
                      rows={6}
                      maxLength={4096}
                    />
                    <p className="text-xs text-gray-500 text-right">
                      {message.length}/4096 characters
                    </p>
                  </div>
                </TabsContent>

                {/* Media Messages (Image, Video, Audio, Document) */}
                {['image', 'video', 'audio', 'document'].map((type) => (
                  <TabsContent key={type} value={type} className="space-y-4">
                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label>Upload {type.charAt(0).toUpperCase() + type.slice(1)} *</Label>
                      
                      {!file ? (
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="flex flex-col items-center gap-2">
                            {getFileIcon()}
                            <p className="text-sm text-gray-600">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                              Max file size: 16MB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-300 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {filePreview ? (
                                messageType === 'image' ? (
                                  <img 
                                    src={filePreview} 
                                    alt="Preview" 
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                ) : (
                                  <video 
                                    src={filePreview} 
                                    className="w-20 h-20 object-cover rounded"
                                    controls
                                  />
                                )
                              ) : (
                                getFileIcon()
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveFile}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={getAcceptedTypes()}
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Caption (for image, video, document) */}
                    {(type === 'image' || type === 'video' || type === 'document') && (
                      <div className="space-y-2">
                        <Label htmlFor="caption">Caption (Optional)</Label>
                        <Textarea
                          id="caption"
                          placeholder="Add a caption..."
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          disabled={isLoading}
                          rows={3}
                          maxLength={1024}
                        />
                        <p className="text-xs text-gray-500 text-right">
                          {caption.length}/1024 characters
                        </p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPhoneNumber('');
                    setMessage('');
                    setCaption('');
                    handleRemoveFile();
                    setError('');
                  }}
                  disabled={isLoading}
                >
                  Clear
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Tips for Sending Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• Always include the country code in the phone number</p>
            <p>• Text messages can be up to 4096 characters</p>
            <p>• Image files: JPEG, PNG, GIF (max 5MB recommended)</p>
            <p>• Video files: MP4, 3GPP (max 16MB)</p>
            <p>• Audio files: MP3, OGG, AMR (max 16MB)</p>
            <p>• Document files: PDF, DOC, DOCX (max 100MB)</p>
            <p>• Media messages may take longer to send depending on file size</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SendMessageEnhanced;
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsAPI.get();
        setPhoneNumberId(response.settings?.waba?.phoneNumberId || '');
      } catch (error) {
        console.error('Failed to load settings', error);
      }
    };
    fetchSettings();
  }, []);
