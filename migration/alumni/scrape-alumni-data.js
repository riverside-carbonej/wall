const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeAlumniData() {
    console.log('🚀 Starting alumni data scraping...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for production
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('📖 Loading Hall of Fame page...');
        await page.goto('https://www.riversidealumni.com/hall-of-fame-members/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for the table to load
        await page.waitForSelector('table', { timeout: 10000 });
        
        console.log('📊 Extracting alumni data...');
        
        // Extract data from the table
        const alumniData = await page.evaluate(() => {
            const table = document.querySelector('table');
            if (!table) return [];
            
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            
            return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                
                if (cells.length < 6) return null;
                
                return {
                    category: cells[0]?.textContent?.trim() || '',
                    inductionYear: cells[1]?.textContent?.trim() || '',
                    graduationYear: cells[2]?.textContent?.trim() || '',
                    firstName: cells[3]?.textContent?.trim() || '',
                    lastName: cells[4]?.textContent?.trim() || '',
                    maidenName: cells[5]?.textContent?.trim() || '',
                    fullName: `${cells[3]?.textContent?.trim() || ''} ${cells[4]?.textContent?.trim() || ''}`.trim()
                };
            }).filter(item => item && item.firstName && item.lastName);
        });
        
        console.log(`✅ Extracted ${alumniData.length} alumni records`);
        
        // Check for pagination or "show more" buttons
        console.log('🔍 Checking for additional pages...');
        
        // Look for pagination controls
        const hasMorePages = await page.evaluate(() => {
            // Check for common pagination elements
            const nextButton = document.querySelector('.next, .pagination-next, [aria-label="Next"]');
            const pageNumbers = document.querySelectorAll('.page-numbers, .pagination a');
            const loadMoreButton = document.querySelector('.load-more, .show-more');
            
            return {
                nextButton: !!nextButton,
                pageNumbers: pageNumbers.length > 0,
                loadMoreButton: !!loadMoreButton,
                totalElements: document.querySelectorAll('a, button').length
            };
        });
        
        console.log('Pagination analysis:', hasMorePages);
        
        // Save the data
        const outputPath = './alumni-data.json';
        fs.writeFileSync(outputPath, JSON.stringify(alumniData, null, 2));
        
        console.log(`💾 Data saved to ${outputPath}`);
        console.log(`📈 Summary: ${alumniData.length} alumni records extracted`);
        
        // Show sample data
        console.log('\n📋 Sample records:');
        alumniData.slice(0, 3).forEach((alumni, index) => {
            console.log(`${index + 1}. ${alumni.fullName} (${alumni.graduationYear}) - Inducted ${alumni.inductionYear} - Category: ${alumni.category}`);
        });
        
        return alumniData;
        
    } catch (error) {
        console.error('❌ Error scraping alumni data:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Check if puppeteer is installed
function checkDependencies() {
    try {
        require('puppeteer');
        return true;
    } catch (error) {
        console.log('❌ Puppeteer not found. Installing...');
        console.log('Run: npm install puppeteer');
        return false;
    }
}

if (require.main === module) {
    if (!checkDependencies()) {
        process.exit(1);
    }
    
    scrapeAlumniData()
        .then(data => {
            console.log('\n✅ Scraping completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeAlumniData };