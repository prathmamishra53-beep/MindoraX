const fs = require('fs');
let content = fs.readFileSync('src/models/Post.ts', 'utf-8');
content = content.replace(/mediaUrls: string\[\];/, 'mediaUrls: string[];\n  mediaPublicIds: string[];');
content = content.replace(/mediaUrls: \{[\s\S]*?\},/, \mediaUrls: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 4,
        message: 'Maximum 4 media items allowed',
      },
    },
    mediaPublicIds: {
      type: [String],
      default: [],
    },\);
fs.writeFileSync('src/models/Post.ts', content);

