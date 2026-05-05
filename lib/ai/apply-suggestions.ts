'use server';

import { requireWorkspaceAccess } from '@/lib/auth/session';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { type CopyIssue } from '@/lib/ai/actions';

export interface ApplySuggestionsInput {
  htmlBody: string;
  issues: CopyIssue[];
  ctaSuggestion?: string;
}

export async function applyAllSuggestions(
  input: ApplySuggestionsInput
): Promise<{ success: true; data: { updatedHtml: string; appliedCount: number } } | { success: false; error: string }> {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const creditCheck = await checkCredits(workspaceId, 'applyAllSuggestions');
    if (!creditCheck.allowed) {
      return { success: false, error: `Not enough AI credits. Need 1, have ${creditCheck.currentBalance}.` };
    }

    let updatedHtml = input.htmlBody;
    let appliedCount = 0;

    // Apply issue fixes
    for (const issue of input.issues) {
      // Escape regex special characters in the 'before' string
      const escapedBefore = issue.before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create a regex that matches the text, allowing for optional HTML tags between words
      // This is a simplified approach. A more robust approach would parse the HTML.
      // We replace spaces with a pattern that matches spaces and optional HTML tags.
      const regexPattern = escapedBefore.split(/\s+/).join('\\s*(?:<[^>]+>\\s*)*');
      const regex = new RegExp(regexPattern, 'i');

      if (regex.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(regex, issue.after);
        appliedCount++;
      }
    }

    // Apply CTA suggestion
    if (input.ctaSuggestion) {
      // Find the CTA button text. It's usually inside an <a> tag with specific styling.
      // We'll look for the text inside the <a> tag that looks like a button.
      // Since we don't know the exact original text, we can try to find the CTA link.
      // The scaffold uses: <a href="{{cta_url}}" ...>[CTA BUTTON TEXT]</a>
      // We can look for <a href="{{cta_url}}" ...>.*?</a> and replace the content.
      
      const ctaRegex = /(<a\s+href="\{\{cta_url\}\}"[^>]*>)(.*?)(<\/a>)/i;
      if (ctaRegex.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(ctaRegex, `$1${input.ctaSuggestion}$3`);
        appliedCount++;
      } else {
        // Fallback: try to find any <a> tag that looks like a button (has background color, padding, etc.)
        // This is riskier, but might work if the user changed the href.
        const fallbackCtaRegex = /(<a\s+[^>]*style="[^"]*background:[^"]*padding:[^"]*"[^>]*>)(.*?)(<\/a>)/i;
        if (fallbackCtaRegex.test(updatedHtml)) {
          updatedHtml = updatedHtml.replace(fallbackCtaRegex, `$1${input.ctaSuggestion}$3`);
          appliedCount++;
        }
      }
    }

    await deductCredits(workspaceId, 'applyAllSuggestions');

    return {
      success: true,
      data: {
        updatedHtml,
        appliedCount,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to apply suggestions' };
  }
}
