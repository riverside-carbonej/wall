const fs = require('fs');

// The raw table data from the website
const rawData = `Faculty & Staff    2024        Anthony    Montonini    
Athletic Coach    2024        Patrick    McKenrick    
Athlete    2024    2007    Alison    Tobias    
Alumni    2024    1980    Laurie    Sterling    Sanders
Alumni    2024    2006    Anna    Dey    Hollingsworth
Athlete    2023    1961    Robert    More    
Athlete    2023    2004    Michaela    Burriss    Hahn
Alumni    2023    2006    Amir    Jones    
Alumni    2023    1995    Joshua D.    Grill    
Alumni    2023    1962    David    Lautenschlager    
Faculty & Staff    2023        Becky    Bartholomew    
Alumni    2022    1988    Del    Bethel    
Alumni    2022    1989    Al    Raddatz    
Alumni    2022    1962    Linda    Lucas    Marcel
Alumni    2022    1980    Dianne    Miley    Haynes
Alumni    2022    1979    Karen    Honkala    White
Athlete    2022    2001    Jesse    Burke    
Athlete    2022    1984    Gerald "Chip"    Sorber    
Faculty & Staff    2021        Karen    Berry    
Athlete    2021    2001    Jason    Cavell    
Athlete    2021    1992    Amy    Koepp    Bartholomew
Athlete    2021    1999    Christopher    Basich    
Alumni    2021    1995    Michael    Dingeldein    
Alumni    2021    1980    Shellie    Graf    Levin
Alumni    2021    1970    Peter    Lillback    
Alumni    2021    1977    Rick    McVey    
Alumni    2021    1997    Christopher    Sopko    
Alumni    2019    1980    Ellen    Forbus    Arsulic
Alumni    2019    1989    Brian    Peterson    
Alumni    2019    1980    Deborah    Rosch    Sorber
Athlete    2019    1993    Melissa    Ezzo    Latshaw
Athlete    2019    1991    Russell    Pernus    
Athlete    2019    1997    Nathan    Tekavec    
Athlete    2018    2004    Courtney    Eppich    Kolesar
Faculty & Staff    2018        Luise    Hanold    
Alumni    2018    1980    Kristen    Keefe, PhD    
Athlete    2018    2003    Eric    Lakia    
Alumni    2018    1981    Merralee    Retallick    
Alumni    2018    1979    Dr. John    Vonhof    
Athlete    2017    1989    Brian    Ashworth    
Alumni    2017    1979    Ted    Orris    
Alumni    2017    1980    Joel    Percival    
Faculty & Staff    2017    1983    Mike    Vaccariello    
Athlete    2017    1993    Craig    Young    
Athlete    2016    1996    Matt    Domin    
Alumni    2016    1979    Terry    Hamilton    
Faculty & Staff    2016        Carol    Lewis    
Alumni    2015    1965    Bruce    Beaty*    
Alumni    2015    1967    William    Guyer    
Alumni    2015    1990    Jeffrey    Marut    
Faculty & Staff    2015        Kathleen    Riley    
Faculty & Staff    2015        Janice    Wunderlich    
Athlete    2010    Coach    Frank    Gerard*    
Athlete    2010    1971    Geoffrey    Hanahan    
Faculty & Staff    2010        Charlie    Neal*    
Athlete    2010    1961    Robert    Pomeroy^    
Athlete    2010    1972    Donald    Pomeroy    
Athlete    2010    1967    Donald    Simpson    
Athlete    2010    1963    William    Stalker    
Athlete    2009    Coach    Lawrence "Skip"    Brewster*    
Athlete    2007    1990    Tonya    Niemeyer    Farmer
Faculty & Staff    2007        Mary    Porter*    
Alumni    2007    1975    Phillip    Quick    
Faculty & Staff    2007        Michael    Shoaf    
Alumni    2006    1960    Dennis    Congos    
Alumni    2006    1986    Keith    DeWitt    
Alumni    2006    1985    Joseph    Loth    
Alumni    2006    1987    Michelle    Odom    Trusso
Faculty & Staff    2006        Al    Porter*    
Athlete    2006    1985    Scott    Shafer    
Alumni    2005    1964    Ronald    Filson    
Faculty & Staff    2005        John    Reed    
Faculty & Staff    2004        Carol    Benroth    
Alumni    2004    1966    Michael    Celizic*    
Athlete    2004    1991    Missy    Moon    
Athlete    2003    1993    Lisa    Adams    
Faculty & Staff    2003        Robert    Capella*    
Athlete    2003    1980    Brian    Carlton    
Alumni    2003    1976    Robert    Haight    
Alumni    2003    1969    Bruce    Hanusosky    
Athlete    2003    1991    Kelly    Stewart    Bell
Faculty & Staff    2003        Dennis    Watson    
Athlete    2002    Coach/1967    Don    Andersen*    
Alumni    2002    1968    Elbert    Blakely, Jr.    
Faculty & Staff    2002        Emma Lou    Dalheim*    
Athlete    2002    1992    Karyn    Loveless    Pomfrey
Faculty & Staff    2002        Harold    Parsons*    
Alumni    2002    1981    Neal    Sivula    
Faculty & Staff    2002        Marijane    Watson    
Alumni    2001    1972    Gary    Engle    
Athlete    2001    1954    Frank    Haight*    
Alumni    2001    1970    John    Hine    
Athlete    2001    Coach    Therese    King    
Alumni    2001    1960    Natalie    Newhous    
Faculty & Staff    2001        Trent    Norris    
Athlete    2001    1978    Mark    Parrish    
Faculty & Staff    2001        Gretchen    Reed    
Athlete    2000    1953    James    Evans    
Alumni    2000    1954    Edwin    Gibbon    
Athlete    2000    1988    Kimm    Leininger    Pernus
Alumni    2000    1963    Janice    Martin    Webster
Alumni    2000    1953    Donald    McBride    
Faculty & Staff    2000        Robert    Smith*    
Faculty & Staff    1999        Louis    Andersen*    
Faculty & Staff    1999        Martha    Goodwin*    
Athlete    1999    Coach    Robert    McFarren*    
Alumni    1999    1960    Martin    Parks    
Faculty & Staff    1999        Nadine    Percival    
Alumni    1999    1961    Grady    Pettigrew    
Alumni    1999    1963    Richard    Pritchard    
Alumni    1999    1966    Leslie    Stanfanick    Karlin
Athlete    1998    1986    Kurt    Bell    
Alumni    1998    1969    Michael    Cicconetti    
Alumni    1998    1963    Candy    Forest    Mordush
Athlete    1998    1972    James    Gerard    
Alumni    1998    1979    Carol    Goble*    
Faculty & Staff    1998        Lois    Harrington    
Faculty & Staff    1998        Nancy    Johnson*    
Faculty & Staff    1998        Maren    Larsen*    
Faculty & Staff    1998        Peggy    Lewis*    
Alumni    1998    1961    William    Lowrie    
Faculty & Staff    1998        Carol    Muster    
Alumni    1998    1952    Doug    Pomfrey*    
Athlete    1998    1988    Michael    Richner    
Athlete    1998    Coach    Ron    Shafer*    
Athlete    1998    Coach    Robert    Smith    
Faculty & Staff    1998        John    Weiss    
Faculty & Staff    1997        George    Adams*    
Faculty & Staff    1997        Margaret    Barber    
Faculty & Staff    1997        Loretta    Bearer    
Alumni    1997    1976    Kirk    Betteley    
Alumni    1997    1979    Pamela    Bowsman    Lohiser
Faculty & Staff    1997        Jane    Braden*    
Alumni    1997    1965    Gary    Bukovnik    
Faculty & Staff    1997        David    Burris*    
Faculty & Staff    1997        Merle    Court*    
Faculty & Staff    1997        John    DeLong*    
Alumni    1997    1967    Darryl    Dunlap    
Alumni    1997    1967    Daniel    Dunlap    
Alumni    1997    1959    Diane    Gray    
Athlete    1997    1963    Edward    Guyer    
Alumni    1997    1952    George    Hadden    
Alumni    1997    1967    Paul "Toby"    Hanahan    
Faculty & Staff    1997        Jacqueline    Hood*    
Faculty & Staff    1997        George    Inscho, Jr.*    
Faculty & Staff    1997        Mary    Kosinski*    
Faculty & Staff    1997        Henry    LaMuth*    
Alumni    1997    1973    Arthur    Martin    
Faculty & Staff    1997        Bernadine    McFarren*    
Alumni    1997    1981    Pamela    Moser    Shafer
Alumni    1997    1980    Dan    O'Shannon    
Alumni    1997    1980    Lydia    Parker    Urbassik
Athlete    1997    1967    Leonard    Pettigrew    
Athlete    1997    1954    Donald    Pomfrey    
Athlete    1997    Coach    George    Riser    
Athlete    1997    1985    Margie    Shack    
Faculty & Staff    1997        David    Shaner*    
Alumni    1997    1961    Art    Sidley    
Alumni    1997    1986    Heidi    Skok    
Faculty & Staff    1997        Roger    Stanley*    
Faculty & Staff    1997        Betts    Strailey*    
Faculty & Staff    1997        Mary    Thrasher*`;

function parseAlumniData() {
    console.log('🚀 Parsing alumni data from provided text...');
    
    const lines = rawData.trim().split('\n');
    const alumni = [];
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Split by multiple spaces to separate columns
        const parts = line.trim().split(/\s{2,}/);
        
        if (parts.length >= 4) {
            const category = parts[0] || '';
            const inductionYear = parts[1] || '';
            let graduationYear = '';
            let firstName = '';
            let lastName = '';
            let maidenName = '';
            
            // Handle different column structures
            if (parts.length === 6) {
                // Category, InductionYear, GraduationYear, FirstName, LastName, MaidenName
                graduationYear = parts[2];
                firstName = parts[3];
                lastName = parts[4];
                maidenName = parts[5];
            } else if (parts.length === 5) {
                // Category, InductionYear, FirstName, LastName, MaidenName
                firstName = parts[2];
                lastName = parts[3];
                maidenName = parts[4];
            } else if (parts.length === 4) {
                // Category, InductionYear, FirstName, LastName
                firstName = parts[2];
                lastName = parts[3];
            }
            
            // Clean up graduation year
            if (graduationYear && graduationYear !== 'Coach' && !isNaN(graduationYear)) {
                // Keep graduation year
            } else if (graduationYear === 'Coach' || graduationYear === '') {
                // Move graduation year info to firstName if needed
                if (graduationYear === 'Coach') {
                    firstName = 'Coach ' + firstName;
                }
                graduationYear = '';
            }
            
            const alumniRecord = {
                category: category.trim(),
                inductionYear: inductionYear.trim(),
                graduationYear: graduationYear.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                maidenName: maidenName.trim(),
                fullName: `${firstName.trim()} ${lastName.trim()}`.trim()
            };
            
            // Only add if we have at least first and last name
            if (alumniRecord.firstName && alumniRecord.lastName) {
                alumni.push(alumniRecord);
            }
        }
    }
    
    return alumni;
}

function main() {
    try {
        const alumniData = parseAlumniData();
        
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
            const gradInfo = alumni.graduationYear ? ` - Class of ${alumni.graduationYear}` : '';
            console.log(`${index + 1}. ${alumni.fullName}${maidenInfo} - ${alumni.category}${gradInfo} - Inducted ${alumni.inductionYear}`);
        });
        
        return alumniData;
        
    } catch (error) {
        console.error('❌ Error parsing alumni data:', error.message);
        throw error;
    }
}

if (require.main === module) {
    main()
        .then(data => {
            console.log('\n✅ Parsing completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Parsing failed:', error);
            process.exit(1);
        });
}

module.exports = { parseAlumniData };