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
    const isAvailable = availableMatch ? availableMatch[1].includes(`<domain>${cleanDomain}</domain>`) : false;

    if (!isAvailable) {
      return { available: false };
    }

    // Now try to fetch the pricing dynamically
    let priceStr = '$13.95/yr'; 
    try {
      const priceUrl = `https://www.namesilo.com/api/getPrices?version=1&type=xml&key=${apiKey}`;
      const priceRes = await fetch(priceUrl, { cache: 'no-store', next: { revalidate: 3600 } });
      const priceText = await priceRes.text();
      
      const ext = cleanDomain.split('.').pop() || 'com';
      
      // Look for the specific TLD price in the XML (e.g., <com><registration>13.95</registration></com>)
      const regex = new RegExp(`<${ext}>.*?<registration>([0-9.]+)</registration>.*?</${ext}>`, 's');
      const match = priceText.match(regex);
      if (match && match[1]) {
        priceStr = `$${match[1]}/yr`;
      }
    } catch (e) {
      console.error("Failed to fetch exact pricing, falling back to default.", e);
    }

    return { available: true, price: priceStr };

  } catch (error) {
    console.error('Domain check error:', error);
    throw error;
  }
}
