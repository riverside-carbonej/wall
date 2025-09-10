const https = require('https');
const fs = require('fs');

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function debugFetch() {
    console.log('🔍 Fetching page to debug...');
    
    try {
        const html = await fetchPage('https://www.riversidealumni.com/hall-of-fame-members/');
        
        // Save raw HTML to see what we got
        fs.writeFileSync('./debug-page.html', html);
        console.log('💾 Raw HTML saved to debug-page.html');
        
        // Look for table patterns
        console.log('\n🔍 Looking for table patterns...');
        
        const hasTable = html.includes('<table');
        const hasRows = html.includes('<tr');
        const hasCells = html.includes('<td');
        
        console.log('Has <table>:', hasTable);
        console.log('Has <tr>:', hasRows);
        console.log('Has <td>:', hasCells);
        
        // Search for specific text we know should be there
        const hasAnthony = html.includes('Anthony');
        const hasMontonini = html.includes('Montonini');
        const hasFaculty = html.includes('Faculty');
        
        console.log('Contains "Anthony":', hasAnthony);
        console.log('Contains "Montonini":', hasMontonini);
        console.log('Contains "Faculty":', hasFaculty);
        
        // Show a snippet around any table we find
        const tableMatch = html.match(/<table[\s\S]{0,500}/i);
        if (tableMatch) {
            console.log('\n📋 Table snippet found:');
            console.log(tableMatch[0]);
        }
        
        console.log(`\n📏 Total HTML length: ${html.length} characters`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugFetch();