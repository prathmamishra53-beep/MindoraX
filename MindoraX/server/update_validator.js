const fs = require('fs');
let content = fs.readFileSync('src/utils/validators.ts', 'utf-8');
content = content.replace(/export const updateProfileSchema = z\.object\(\{[\s\S]*?\}\);/, 'export const updateProfileSchema = z.object({\n  displayName: z.string().min(2, { message: \'Display name must be at least 2 characters\' }).max(50).optional(),\n  bio: z.string().max(200, { message: \'Bio cannot exceed 200 characters\' }).optional(),\n  location: z.string().max(100, { message: \'Location cannot exceed 100 characters\' }).optional(),\n  website: z.union([z.literal(\'\'), z.string().url({ message: \'Website must be a valid URL\' }).max(200)]).optional(),\n});');
fs.writeFileSync('src/utils/validators.ts', content);
