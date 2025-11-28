import prisma from '../config/prisma.js';
import { getMetaAPIForTenant } from './metaAPI.js';
import { log } from '../utils/logger.js';

type TemplateComponentInput = {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: string;
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
};

type NormalizedComponents = {
  headerType?: string | null;
  headerText?: string | null;
  headerMediaUrl?: string | null;
  bodyText: string;
  footerText?: string | null;
  buttons: any[] | null;
};

const META_CATEGORY = ['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const;

const LANGUAGE_FALLBACKS: Record<string, string> = {
  en: 'en_US',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  hi: 'hi_IN',
};

function normalizeLanguage(language: string) {
  const trimmed = language.trim();
  if (!trimmed) return 'en_US';
  if (trimmed.includes('_')) return trimmed;
  return LANGUAGE_FALLBACKS[trimmed.toLowerCase()] || `${trimmed}_${trimmed.toUpperCase()}`;
}

export function sanitizeTemplateName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeComponents(components: TemplateComponentInput[]): NormalizedComponents {
  const header = components.find((c) => c.type === 'HEADER');
  const body = components.find((c) => c.type === 'BODY');
  const footer = components.find((c) => c.type === 'FOOTER');
  const buttons = components.find((c) => c.type === 'BUTTONS');

  if (!body?.text) {
    throw new Error('A BODY component with text is required');
  }

  return {
    headerType: header?.format || (header ? 'TEXT' : null),
    headerText: header?.text || null,
    headerMediaUrl: null,
    bodyText: body.text,
    footerText: footer?.text || null,
    buttons: buttons?.buttons || null,
  };
}

function buildMetaComponents(components: TemplateComponentInput[]) {
  return components.map((component) => {
    if (component.type === 'HEADER' && !component.format) {
      return { ...component, format: 'TEXT' };
    }
    return component;
  });
}

export function formatTemplateResponse(template: any) {
  const components = template.components || [];

  if (!components.length) {
    const builtComponents: TemplateComponentInput[] = [];
    if (template.headerText) {
      builtComponents.push({
        type: 'HEADER',
        format: template.headerType || 'TEXT',
        text: template.headerText,
      });
    }
    builtComponents.push({
      type: 'BODY',
      text: template.bodyText,
    });
    if (template.footerText) {
      builtComponents.push({
        type: 'FOOTER',
        text: template.footerText,
      });
    }
    if (template.buttons) {
      builtComponents.push({
        type: 'BUTTONS',
        buttons: template.buttons,
      });
    }
    return {
      id: template.id,
      name: template.displayName || template.name,
      category: template.category,
      language: template.language,
      status: template.status,
      rejectionReason: template.rejectionReason,
      components: builtComponents,
      metaName: template.name,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  return {
    id: template.id,
    name: template.displayName || template.name,
    category: template.category,
    language: template.language,
    status: template.status,
    rejectionReason: template.rejectionReason,
    components,
    metaName: template.name,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

async function getTenantCredential(tenantId: string) {
  const credential = await prisma.wABACredential.findFirst({
    where: { tenantId, isValid: true },
  });

  if (!credential) {
    throw new Error('No valid WhatsApp Business credentials found for this tenant');
  }

  if (!credential.businessAccountId) {
    throw new Error('Business Account ID is missing. Update it in Settings before managing templates.');
  }

  return credential;
}

export async function syncTemplatesWithMeta(tenantId: string) {
  const credential = await getTenantCredential(tenantId);
  const metaAPI = await getMetaAPIForTenant(tenantId);
  const metaTemplates = await metaAPI.getTemplates(credential.businessAccountId);

  const remoteKeys = new Set<string>();

  for (const template of metaTemplates.templates || []) {
    const key = `${template.name}_${template.language}`;
    remoteKeys.add(key);

    const normalized = normalizeComponents((template.components || []) as TemplateComponentInput[]);

    await prisma.template.upsert({
      where: {
        tenantId_name_language: {
          tenantId,
          name: template.name,
          language: template.language,
        },
      },
      create: {
        tenantId,
        name: template.name,
        displayName: template.name,
        category: template.category,
        language: template.language,
        status: template.status || 'PENDING',
        metaTemplateId: template.id,
        components: template.components,
        headerType: normalized.headerType || undefined,
        headerText: normalized.headerText || undefined,
        bodyText: normalized.bodyText,
        footerText: normalized.footerText || undefined,
        buttons: normalized.buttons,
      },
      update: {
        category: template.category,
        status: template.status || 'PENDING',
        rejectionReason: template.rejectionReason || null,
        components: template.components,
        metaTemplateId: template.id,
        headerType: normalized.headerType || undefined,
        headerText: normalized.headerText || undefined,
        bodyText: normalized.bodyText,
        footerText: normalized.footerText || undefined,
        buttons: normalized.buttons,
      },
    });
  }

  // Disable templates not present in remote data
  const localTemplates = await prisma.template.findMany({
    where: { tenantId },
    select: { id: true, name: true, language: true },
  });

  const toDisable = localTemplates.filter(
    (tpl) => !remoteKeys.has(`${tpl.name}_${tpl.language}`)
  );

  if (toDisable.length > 0) {
    await prisma.template.updateMany({
      where: {
        id: {
          in: toDisable.map((tpl) => tpl.id),
        },
      },
      data: { status: 'DISABLED' },
    });
  }

  return { synced: metaTemplates.templates?.length || 0 };
}

export async function createTemplateForTenant(
  tenantId: string,
  payload: {
    name: string;
    category: typeof META_CATEGORY[number];
    language: string;
    components: TemplateComponentInput[];
  }
) {
  const credential = await getTenantCredential(tenantId);
  const metaAPI = await getMetaAPIForTenant(tenantId);
  const normalizedName = sanitizeTemplateName(payload.name);
  const normalizedLanguage = normalizeLanguage(payload.language);
  const normalizedComponents = normalizeComponents(payload.components);
  const metaComponents = buildMetaComponents(payload.components);

  const result = await metaAPI.createTemplate(
    credential.businessAccountId,
    normalizedName,
    payload.category,
    normalizedLanguage,
    metaComponents
  );

  const template = await prisma.template.create({
    data: {
      tenantId,
      name: normalizedName,
      displayName: payload.name,
      category: payload.category,
      language: normalizedLanguage,
      status: 'PENDING',
      metaTemplateId: result.templateId,
      components: payload.components,
      headerType: normalizedComponents.headerType || undefined,
      headerText: normalizedComponents.headerText || undefined,
      bodyText: normalizedComponents.bodyText,
      footerText: normalizedComponents.footerText || undefined,
      buttons: normalizedComponents.buttons,
    },
  });

  log.info('Template created via Meta API', {
    tenantId,
    templateName: normalizedName,
  });

  return template;
}

export async function updateTemplateForTenant(
  tenantId: string,
  templateId: string,
  payload: {
    name?: string;
    category?: typeof META_CATEGORY[number];
    language?: string;
    components?: TemplateComponentInput[];
  }
) {
  const existing = await prisma.template.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!existing) {
    throw new Error('Template not found');
  }

  const updatedName = payload.name || existing.displayName || existing.name;
  const normalizedName = sanitizeTemplateName(updatedName);
  const updatedCategory = payload.category || existing.category;
  const updatedLanguage = payload.language
    ? normalizeLanguage(payload.language)
    : existing.language;
  const updatedComponents =
    payload.components ||
    (existing.components as TemplateComponentInput[]) || [
      { type: 'BODY', text: existing.bodyText },
    ];

  const credential = await getTenantCredential(tenantId);
  const metaAPI = await getMetaAPIForTenant(tenantId);
  const normalizedComponents = normalizeComponents(updatedComponents);
  const metaComponents = buildMetaComponents(updatedComponents);

  const result = await metaAPI.createTemplate(
    credential.businessAccountId,
    normalizedName,
    updatedCategory,
    updatedLanguage,
    metaComponents
  );

  const updated = await prisma.template.update({
    where: { id: templateId },
    data: {
      name: normalizedName,
      displayName: updatedName,
      category: updatedCategory,
      language: updatedLanguage,
      status: 'PENDING',
      metaTemplateId: result.templateId,
      components: updatedComponents,
      headerType: normalizedComponents.headerType || undefined,
      headerText: normalizedComponents.headerText || undefined,
      bodyText: normalizedComponents.bodyText,
      footerText: normalizedComponents.footerText || undefined,
      buttons: normalizedComponents.buttons,
      rejectionReason: null,
    },
  });

  return updated;
}

export async function deleteTemplateForTenant(tenantId: string, templateId: string) {
  const template = await prisma.template.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  const credential = await getTenantCredential(tenantId);
  const metaAPI = await getMetaAPIForTenant(tenantId);

  await metaAPI.deleteTemplate(credential.businessAccountId, template.name, template.language);

  await prisma.template.delete({
    where: { id: templateId },
  });

  return true;
}
