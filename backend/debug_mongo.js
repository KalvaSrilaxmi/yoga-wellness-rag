require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

console.log('--- MongoDB Connection Diagnostics ---');
console.log('1. Checking Environment Variables...');
if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in .env');
    process.exit(1);
}
console.log('✅ MONGODB_URI found');

// Extract hostname from URI
const uri = process.env.MONGODB_URI;
const hostMatch = uri.match(/@([^/]+)/);
if (!hostMatch) {
    console.error('❌ Could not parse hostname from URI');
    process.exit(1);
}
const hostname = hostMatch[1];
console.log(`Target Hostname: ${hostname}`);

console.log('\n2. Testing DNS Resolution...');
dns.resolveSrv('_mongodb._tcp.' + hostname, (err, addresses) => {
    if (err) {
        console.error('❌ DNS SRV Lookup Failed:', err.code);
        console.log('   This usually means a network firewall is blocking DNS or the cluster address is wrong.');
    } else {
        console.log('✅ DNS SRV Lookup Successful');
        console.log('   Addresses:', addresses);

        console.log('\n3. Attempting Mongoose Connection...');
        mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
            .then(() => {
                console.log('✅ Connected Successfully!');
                process.exit(0);
            })
            .catch(err => {
                console.error('❌ Connection Failed:', err.message);
                console.log('\n--- Troubleshooting ---');
                if (err.message.includes('whitlist') || err.message.includes('whitelist')) {
                    console.log('👉 CAUSE: IP Whitelist blocking access.');
                } else if (err.message.includes('bad auth')) {
                    console.log('👉 CAUSE: Incorrect Username or Password.');
                } else {
                    console.log('👉 CAUSE: Network timeout or Firewall.');
                }
                process.exit(1);
            });
    }
});
