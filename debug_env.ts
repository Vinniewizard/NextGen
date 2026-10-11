import dotenv from 'dotenv';
import path from 'path';

// Load variables, ensuring .env is prioritized
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.example') });

console.log('DEBUG: Environment Variables Loading');
console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME);
console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '********' : 'undefined');
console.log('ADMIN_SECRET_KEY:', process.env.ADMIN_SECRET_KEY ? '********' : 'undefined');
console.log('All process.env keys:', Object.keys(process.env).filter(k => k.startsWith('ADMIN_')));
