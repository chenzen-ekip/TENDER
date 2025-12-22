
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const secKey = process.env.CLERK_SECRET_KEY;

console.log("--- KEY CHECK ---");
if (pubKey && pubKey.startsWith("pk_")) {
    console.log("✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY found (starts with pk_)");
} else {
    console.log("❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is MISSING or INVALID");
}

if (secKey && secKey.startsWith("sk_")) {
    console.log("✅ CLERK_SECRET_KEY found (starts with sk_)");
} else {
    console.log("❌ CLERK_SECRET_KEY is MISSING or INVALID");
}
console.log("-----------------");
