const fs = require('fs');
const path = require('path');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const OUTPUT_DIR = path.join(__dirname, '../assets/art');
const DATA_FILE = path.join(__dirname, '../gallery.json');

// Ensure assets directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchGallery() {
  const response = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`, {
    headers: { Authorization: `Bot ${DISCORD_TOKEN}` }
  });

  if (!response.ok) {
    console.error('Failed to fetch Discord messages', await response.text());
    return;
  }

  const messages = await response.json();
  let gallery = [];

  for (const msg of messages) {
    for (const attachment of msg.attachments) {
      // Filter out non-image files and videos
      if (attachment.content_type && attachment.content_type.startsWith('image/') && !attachment.content_type.includes('gif')) {
        const ext = path.extname(attachment.filename) || '.png';
        const fileName = `${attachment.id}${ext}`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        // Download image locally if it doesn't exist
        if (!fs.existsSync(filePath)) {
          console.log(`Downloading new art: ${fileName}`);
          const imgRes = await fetch(attachment.url);
          const arrayBuffer = await imgRes.arrayBuffer();
          fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
        }

        gallery.push({
          id: attachment.id,
          src: `assets/art/${fileName}`,
          caption: msg.content || '',
          timestamp: msg.timestamp
        });
      }
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(gallery, null, 2));
  console.log('Gallery successfully synced!');
}

fetchGallery();
