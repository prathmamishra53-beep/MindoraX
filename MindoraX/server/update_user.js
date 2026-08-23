const fs = require('fs');
let content = fs.readFileSync('src/models/User.ts', 'utf-8');
content = content.replace(/streak: number;/, 'streak: number;\n  lastStreakDate?: Date;');
content = content.replace(/streak: \{ type: Number, default: 0 \},/, 'streak: { type: Number, default: 0 },\n    lastStreakDate: { type: Date },');
fs.writeFileSync('src/models/User.ts', content);
