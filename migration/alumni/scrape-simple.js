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

function parseHallOfFameData(html) {
    console.log('📊 Parsing HTML table data...');
    
    // Extract table rows - look for the pattern in the HTML
    const tablePattern = /<tr[^>]*>(.*?)<\/tr>/gs;
    const cellPattern = /<td[^>]*>(.*?)<\/td>/gs;
    
    const rows = [];
    let match;
    
    while ((match = tablePattern.exec(html)) !== null) {
        const rowHtml = match[1];
        const cells = [];
        let cellMatch;
        
        while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
            // Clean up cell content - remove HTML tags and trim
            const cellContent = cellMatch[1]
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            cells.push(cellContent);
        }
        
        // Only process rows with 6 cells (Category, Year of Induction, Graduation Year, First name, Last Name, Maiden Name)
        if (cells.length === 6) {
            const [category, inductionYear, graduationYear, firstName, lastName, maidenName] = cells;
            
            // Skip header row
            if (firstName !== 'First name' && firstName !== '') {
                rows.push({
                    category: category || '',
                    inductionYear: inductionYear || '',
                    graduationYear: graduationYear || '',
                    firstName: firstName || '',
                    lastName: lastName || '',
                    maidenName: maidenName || '',
                    fullName: `${firstName} ${lastName}`.trim()
                });
            }
        }
    }
    
    return rows;
}

async function scrapeAlumniData() {
    console.log('🚀 Starting alumni data scraping...');
    
    try {
        console.log('📖 Fetching Hall of Fame page...');
        const html = await fetchPage('https://www.riversidealumni.com/hall-of-fame-members/');
        
        console.log('🔍 Extracting data from HTML...');
        const alumniData = parseHallOfFameData(html);
        
        console.log(`✅ Extracted ${alumniData.length} alumni records`);
        
        // Save the data
        const outputPath = './alumni-data.json';
        fs.writeFileSync(outputPath, JSON.stringify(alumniData, null, 2));
        
        console.log(`💾 Data saved to ${outputPath}`);
        
        // Show summary by category
        const categories = {};
        alumniData.forEach(alumni => {
            categories[alumni.category] = (categories[alumni.category] || 0) + 1;
        });
        
        console.log('\n📈 Summary by category:');
        Object.entries(categories).forEach(([category, count]) => {
            console.log(`  ${category}: ${count} members`);
        });
        
        // Show sample data
        console.log('\n📋 Sample records:');
        alumniData.slice(0, 5).forEach((alumni, index) => {
            const maidenInfo = alumni.maidenName ? ` (${alumni.maidenName})` : '';
            console.log(`${index + 1}. ${alumni.fullName}${maidenInfo} - ${alumni.category} - Class of ${alumni.graduationYear} - Inducted ${alumni.inductionYear}`);
        });
        
        return alumniData;
        
    } catch (error) {
        console.error('❌ Error scraping alumni data:', error.message);
        throw error;
    }
}

if (require.main === module) {
    scrapeAlumniData()
        .then(data => {
            console.log('\n✅ Scraping completed successfully!');
            console.log(`Total records: ${data.length}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeAlumniData };