import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment files
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.production') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

async function main() {
  const targetEmail = process.argv[2] || process.env.TEST_EMAIL || process.env.BREVO_SENDER_EMAIL || 'test@example.com';
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'notifications@chekup247.co.za').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || 'ChekUp247 Telehealth').trim();

  console.log('====================================================');
  console.log('       ChekUp247 Brevo Integration Diagnostic       ');
  console.log('====================================================\n');

  console.log('Configuration Check:');
  console.log(`- BREVO_API_KEY: ${apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)} (Length: ${apiKey.length})` : '❌ NOT SET (EMPTY)'}`);
  console.log(`- BREVO_SENDER_EMAIL: "${senderEmail}"`);
  console.log(`- BREVO_SENDER_NAME: "${senderName}"`);
  console.log(`- Recipient Email: "${targetEmail}"\n`);

  if (!apiKey) {
    console.error('❌ ERROR: BREVO_API_KEY is not defined in your environment or .env file!');
    console.log('\nRemedy:');
    console.log('1. Log in to your Brevo account (https://app.brevo.com).');
    console.log('2. Go to Settings -> SMTP & API -> API Keys.');
    console.log('3. Generate a new API Key (it will start with "xkeysib-").');
    console.log('4. Add BREVO_API_KEY=xkeysib-... to your .env.production file on your VPS.');
    console.log('5. Rebuild/restart the container: docker compose -f docker-compose.prod.yml up -d --build api\n');
    process.exit(1);
  }

  // Detect Public IP
  console.log('Detecting server public IP...');
  let publicIp = 'Unknown';
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json');
    if (ipRes.ok) {
      const data = (await ipRes.json()) as { ip: string };
      publicIp = data.ip;
      console.log(`- Server Public IP: ${publicIp}`);
    }
  } catch (err: any) {
    console.log(`- Could not detect public IP: ${err.message}`);
  }

  console.log('\nDispatching test email to Brevo API (https://api.brevo.com/v3/smtp/email)...');

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: targetEmail, name: 'Diagnostic Test Recipient' }],
        subject: `[Diagnostic] ChekUp247 Brevo Test - ${new Date().toLocaleTimeString()}`,
        htmlContent: `
          <div style="font-family: sans-serif; padding: 24px; color: #201712; background: #FAF7F2; border-radius: 12px; border: 1px solid #E9E0D5;">
            <h2 style="color: #2B170F;">ChekUp247 Brevo Integration Diagnostic</h2>
            <p>If you are reading this email, your Brevo Transactional Email integration is <strong>100% operational</strong>!</p>
            <hr style="border: none; border-top: 1px solid #DFAB62; margin: 20px 0;" />
            <p><strong>Server Public IP:</strong> ${publicIp}</p>
            <p><strong>Configured Sender:</strong> ${senderName} &lt;${senderEmail}&gt;</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
        `,
        textContent: `ChekUp247 Brevo Integration Diagnostic. Server IP: ${publicIp}. Sender: ${senderEmail}. Timestamp: ${new Date().toISOString()}`,
      }),
    });

    const responseText = await response.text();
    let responseBody: any;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    console.log(`\nBrevo API Response Status: HTTP ${response.status} ${response.statusText}`);
    console.log('Response Body:', JSON.stringify(responseBody, null, 2));

    if (response.ok) {
      console.log('\n SUCCESS: Brevo accepted the email for delivery!');
      console.log(`- Message ID: ${responseBody.messageId}`);
      console.log('The email will now appear in your Brevo Dashboard under Transactional -> Real-time logs.\n');
    } else {
      console.log('\n❌ FAILED: Brevo rejected the request.');

      if (response.status === 401 && responseBody?.code === 'unauthorized' && responseBody?.message === 'not verified') {
        console.log('\n⚠️ REASON: BREVO IP AUTHORIZATION REQUIRED');
        console.log(`Brevo has blocked requests from your server's IP (${publicIp}) because it has not been authorized.`);
        console.log('How to fix:');
        console.log('1. Check the inbox of your Brevo account email for a message titled "Security Alert: Verify a new IP" or "Validate your IP address".');
        console.log('2. Click the verification link in that email.');
        console.log('3. OR log in to https://app.brevo.com -> Settings (top right) -> Security -> Authorized IPs -> Add: ' + publicIp);
      } else if (response.status === 400 && responseBody?.message?.toLowerCase().includes('sender')) {
        console.log('\n⚠️ REASON: SENDER EMAIL NOT VERIFIED');
        console.log(`The sender email "${senderEmail}" is not verified in your Brevo account.`);
        console.log('How to fix:');
        console.log('1. Log in to https://app.brevo.com -> Senders, Domains & Dedicated IPs -> Senders.');
        console.log(`2. Click "Add a sender" and enter "${senderEmail}".`);
        console.log('3. Open the verification email sent to that address and click the confirmation link.');
      } else if (response.status === 401) {
        console.log('\n⚠️ REASON: INVALID API KEY');
        console.log('Brevo returned 401 Unauthorized (Key not found).');
        console.log('Make sure you are using an API Key (starts with "xkeysib-"), NOT an SMTP key (starts with "xsmtpsib-").');
      }
      console.log('');
    }
  } catch (err: any) {
    console.error(`\n❌ Network error connecting to https://api.brevo.com: ${err.message}`);
    console.log('Ensure your server has outbound internet access and port 443 is open.\n');
  }
}

main();
