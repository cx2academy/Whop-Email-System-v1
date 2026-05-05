'use server';

import { requireAdminAccess } from '@/lib/auth/session';

export async function checkDomainAvailability(domain: string) {
  try {
    const apiKey = process.env.NAMESILO_API_KEY;
    if (!apiKey) {
      console.warn("NAMESILO_API_KEY is not set. Simulating a positive response.");
      return { available: true, price: '$13.95/yr' };
    }

    const cleanDomain = domain.toLowerCase().trim();
    
    // First check availability
    const availUrl = `https://www.namesilo.com/api/checkRegisterAvailability?version=1&type=xml&key=${apiKey}&domains=${cleanDomain}`;
    const availRes = await fetch(availUrl, { cache: 'no-store' });
    const availText = await availRes.text();

    // Check for API errors first
    const codeMatch = availText.match(/<code>(\d+)<\/code>/);
    const detailMatch = availText.match(/<detail>([\s\S]*?)<\/detail>/);
    const apiCode = codeMatch ? codeMatch[1] : null;

    if (apiCode && apiCode !== '300') {
      console.error(`NameSilo API Error (${apiCode}): ${detailMatch ? detailMatch[1] : 'Unknown error'}`);
      // Usually 300 is success. If not 300, something is wrong with the request/key
      if (apiCode === '280') return { available: false }; // Invalid domain
      throw new Error(detailMatch ? detailMatch[1] : 'NameSilo API Error');
    }

    // More robust XML parsing for availability
    const availableMatch = availText.match(/<available>([\s\S]*?)<\/available>/);
    const domainRegex = new RegExp(`<domain[^>]*price="([^"]+)"[^>]*>\\s*${cleanDomain}\\s*<\\/domain>`);
    
    let isAvailable = false;
    let priceStr = '$13.95/yr';

    if (availableMatch) {
      const match = availableMatch[1].match(domainRegex);
      if (match) {
        isAvailable = true;
        if (match[1]) priceStr = `$${match[1]}/yr`;
      } else {
        // Fallback if price attribute is missing but domain is still there
        const simpleDomainRegex = new RegExp(`<domain[^>]*>\\s*${cleanDomain}\\s*<\\/domain>`);
        if (simpleDomainRegex.test(availableMatch[1])) {
          isAvailable = true;
        }
      }
    }

    if (!isAvailable) {
      return { available: false };
    }

    return { available: true, price: priceStr };

  } catch (error) {
    console.error('Domain check error:', error);
    throw error;
  }
}
