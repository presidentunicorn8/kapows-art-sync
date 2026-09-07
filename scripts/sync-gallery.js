const fs = require('fs');
const path = require('path');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const OUTPUT_DIR = path.join(__dirname, '../assets/art');
const DATA_FILE = path.join(__dirname, '../gallery.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load existing gallery JSON to track existing IDs and prevent duplicates
let gallery = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    gallery = JSON.parse(rawData);
  } catch (err) {
    console.warn('Could not parse gallery.json, starting fresh.', err);
    gallery = [];
  }
}

// Create a Set of existing attachment IDs for fast lookup
const existingIds = new Set(gallery.map(item => item.id));

async function fetchGallery() {
  const response = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`, {
    headers: { Authorization: `Bot ${DISCORD_TOKEN}` }
  });

  if (!response.ok) {
    console.error('Failed to fetch Discord messages', await response.text());
    return;
  }

  const messages = await response.json();
  let newItemsCount = 0;

  for (const msg of messages) {
    for (const attachment of msg.attachments) {
      // Filter out non-images
      if (attachment.content_type && attachment.content_type.startsWith('image/') && !attachment.content_type.includes('gif')) {
        
        // Skip duplicate attachments
        if (existingIds.has(attachment.id)) {
          continue;
        }

        const ext = path.extname(attachment.filename) || '.png';
        const fileName = `${attachment.id}${ext}`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        // Download image if it doesn't exist locally
        if (!fs.existsSync(filePath)) {
          console.log(`Downloading new art: ${fileName}`);
          const imgRes = await fetch(attachment.url);
          const arrayBuffer = await imgRes.arrayBuffer();
          fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
        }

        const newItem = {
          id: attachment.id,
          src: `assets/art/${fileName}`,
          caption: msg.content || '',
          timestamp: msg.timestamp
        };

        gallery.push(newItem);
        existingIds.add(attachment.id);
        newItemsCount++;
      }
    }
  }

  // Sort images descending by timestamp (newest first)
  gallery.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  fs.writeFileSync(DATA_FILE, JSON.stringify(gallery, null, 2));
  console.log(`Gallery sync complete. Added ${newItemsCount} new items.`);
}

fetchGallery();
