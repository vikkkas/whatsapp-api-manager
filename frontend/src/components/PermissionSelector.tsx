import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PermissionSelectorProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}

const PERMISSION_GROUPS = {
  'Conversation Management': [
    { value: 'VIEW_CONVERSATIONS', label: 'View Conversations' },
    { value: 'SEND_MESSAGES', label: 'Send Messages' },
    { value: 'DELETE_MESSAGES', label: 'Delete Messages' },
    { value: 'ASSIGN_CONVERSATIONS', label: 'Assign to Others' },
    { value: 'CLOSE_CONVERSATIONS', label: 'Close/Resolve' },
  ],
  'Contact Management': [
    { value: 'VIEW_CONTACTS', label: 'View Contacts' },
    { value: 'CREATE_CONTACTS', label: 'Create Contacts' },
    { value: 'EDIT_CONTACTS', label: 'Edit Contacts' },
    { value: 'DELETE_CONTACTS', label: 'Delete Contacts' },
    { value: 'EXPORT_CONTACTS', label: 'Export Contacts' },
  ],
  'Campaign Management': [
    { value: 'VIEW_CAMPAIGNS', label: 'View Campaigns' },
    { value: 'CREATE_CAMPAIGNS', label: 'Create Campaigns' },
    { value: 'EDIT_CAMPAIGNS', label: 'Edit Campaigns' },
    { value: 'DELETE_CAMPAIGNS', label: 'Delete Campaigns' },
    { value: 'EXECUTE_CAMPAIGNS', label: 'Execute Campaigns' },
  ],
  'Template Management': [
    { value: 'VIEW_TEMPLATES', label: 'View Templates' },
    { value: 'CREATE_TEMPLATES', label: 'Create Templates' },
    { value: 'EDIT_TEMPLATES', label: 'Edit Templates' },
    { value: 'DELETE_TEMPLATES', label: 'Delete Templates' },
  ],
  'Canned Responses': [
    { value: 'VIEW_CANNED_RESPONSES', label: 'View Quick Replies' },
    { value: 'CREATE_CANNED_RESPONSES', label: 'Create Quick Replies' },
    { value: 'EDIT_CANNED_RESPONSES', label: 'Edit Quick Replies' },
    { value: 'DELETE_CANNED_RESPONSES', label: 'Delete Quick Replies' },
  ],
  'Analytics & Reports': [
    { value: 'VIEW_ANALYTICS', label: 'View Analytics' },
    { value: 'EXPORT_ANALYTICS', label: 'Export Reports' },
  ],
  'Settings': [
    { value: 'VIEW_SETTINGS', label: 'View Settings' },
    { value: 'EDIT_SETTINGS', label: 'Edit Settings' },
  ],
  'Team Management': [
    { value: 'VIEW_AGENTS', label: 'View Team' },
    { value: 'MANAGE_AGENTS', label: 'Manage Agents' },
  ],
};

const PRESETS = {
  JUNIOR_AGENT: ['VIEW_CONVERSATIONS', 'SEND_MESSAGES', 'VIEW_CONTACTS', 'VIEW_CANNED_RESPONSES'],
  SENIOR_AGENT: [
    'VIEW_CONVERSATIONS', 'SEND_MESSAGES', 'DELETE_MESSAGES', 'ASSIGN_CONVERSATIONS', 'CLOSE_CONVERSATIONS',
    'VIEW_CONTACTS', 'CREATE_CONTACTS', 'EDIT_CONTACTS',
    'VIEW_CANNED_RESPONSES', 'CREATE_CANNED_RESPONSES',
    'VIEW_ANALYTICS',
  ],
  TEAM_LEAD: [
    'VIEW_CONVERSATIONS', 'SEND_MESSAGES', 'DELETE_MESSAGES', 'ASSIGN_CONVERSATIONS', 'CLOSE_CONVERSATIONS',
    'VIEW_CONTACTS', 'CREATE_CONTACTS', 'EDIT_CONTACTS', 'DELETE_CONTACTS', 'EXPORT_CONTACTS',
    'VIEW_CAMPAIGNS', 'VIEW_TEMPLATES',
    'VIEW_CANNED_RESPONSES', 'CREATE_CANNED_RESPONSES',
    'VIEW_ANALYTICS', 'EXPORT_ANALYTICS',
    'VIEW_AGENTS',
  ],
  MARKETING_MANAGER: [
    'VIEW_CONVERSATIONS',
    'VIEW_CONTACTS', 'CREATE_CONTACTS', 'EDIT_CONTACTS', 'EXPORT_CONTACTS',
    'VIEW_CAMPAIGNS', 'CREATE_CAMPAIGNS', 'EDIT_CAMPAIGNS', 'DELETE_CAMPAIGNS', 'EXECUTE_CAMPAIGNS',
    'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES',
    'VIEW_ANALYTICS', 'EXPORT_ANALYTICS',
  ],
};

export const PermissionSelector = ({ selectedPermissions, onChange }: PermissionSelectorProps) => {
  const [preset, setPreset] = useState<string>('');

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value && value !== 'custom') {
      onChange(PRESETS[value as keyof typeof PRESETS]);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setPreset('custom');
    const newPermissions = selectedPermissions.includes(permission)
      ? selectedPermissions.filter(p => p !== permission)
      : [...selectedPermissions, permission];
    onChange(newPermissions);
  };

  const handleGroupToggle = (groupPermissions: { value: string }[]) => {
    setPreset('custom');
    const groupValues = groupPermissions.map(p => p.value);
    const allSelected = groupValues.every(p => selectedPermissions.includes(p));
    
    if (allSelected) {
      onChange(selectedPermissions.filter(p => !groupValues.includes(p)));
    } else {
      const newPermissions = [...new Set([...selectedPermissions, ...groupValues])];
      onChange(newPermissions);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset Selector */}
      <div className="space-y-2">
        <Label>Permission Preset</Label>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="bg-gray-50 border-gray-200">
            <SelectValue placeholder="Choose a preset or customize..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="JUNIOR_AGENT">Junior Agent (Basic Support)</SelectItem>
            <SelectItem value="SENIOR_AGENT">Senior Agent (Full Support)</SelectItem>
            <SelectItem value="TEAM_LEAD">Team Lead (Support + Management)</SelectItem>
            <SelectItem value="MARKETING_MANAGER">Marketing Manager (Campaigns)</SelectItem>
            <SelectItem value="custom">Custom Permissions</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Permission Groups */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => {
          const allSelected = permissions.every(p => selectedPermissions.includes(p.value));
          const someSelected = permissions.some(p => selectedPermissions.includes(p.value));

          return (
            <Card key={groupName} className="border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => handleGroupToggle(permissions)}
                      className="border-gray-300"
                    />
                    {groupName}
                  </CardTitle>
                  {someSelected && (
                    <Badge variant="secondary" className="text-xs">
                      {permissions.filter(p => selectedPermissions.includes(p.value)).length}/{permissions.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {permissions.map((permission) => (
                  <div key={permission.value} className="flex items-center space-x-2 pl-6">
                    <Checkbox
                      id={permission.value}
                      checked={selectedPermissions.includes(permission.value)}
                      onCheckedChange={() => handlePermissionToggle(permission.value)}
                      className="border-gray-300"
                    />
                    <label
                      htmlFor={permission.value}
                      className="text-sm text-gray-600 cursor-pointer select-none"
                    >
                      {permission.label}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
