import * as React from 'react';
import { 
  Section, 
  Text, 
  Link, 
  Hr, 
  Container 
} from '@react-email/components';

interface EmailFooterProps {
  workspaceName: string;
  physicalAddress?: string;
  unsubscribeUrl: string;
  brandColor?: string;
}

export const EmailFooter = ({
  workspaceName,
  physicalAddress,
  unsubscribeUrl,
  brandColor = '#22C55E',
}: EmailFooterProps) => {
  return (
    <Section style={main}>
      <Hr style={hr} />
      <Container style={container}>
        <Text style={footerText}>
          Sent by <strong>{workspaceName}</strong>
        </Text>
        {physicalAddress && (
          <Text style={addressText}>
            {physicalAddress}
          </Text>
        )}
        <Text style={unsubscribeText}>
          Don&apos;t want these emails?{' '}
          <Link href={unsubscribeUrl} style={{ ...link, color: brandColor }}>
            Unsubscribe here
          </Link>
        </Text>
        <Text style={poweredBy}>
          Powered by <Link href="https://revtray.com" style={revtrayLink}>RevTray</Link>
        </Text>
      </Container>
    </Section>
  );
};

const main = {
  padding: '32px 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const container = {
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
  color: '#4b5563',
};

const addressText = {
  fontSize: '12px',
  lineHeight: '20px',
  margin: '4px 0',
  color: '#9ca3af',
};

const unsubscribeText = {
  fontSize: '12px',
  lineHeight: '20px',
  margin: '12px 0',
  color: '#9ca3af',
};

const link = {
  textDecoration: 'underline',
};

const poweredBy = {
  fontSize: '10px',
  lineHeight: '16px',
  margin: '24px 0 0',
  color: '#d1d5db',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const revtrayLink = {
  color: '#9ca3af',
  textDecoration: 'none',
  fontWeight: 'bold',
};
