// Local/City Tax Configuration for all US jurisdictions
// Last updated: December 2024

export type LocalTaxConfig = {
  city: string;
  state: string;
  residentRate: number;      // Rate for residents (decimal, e.g., 0.024 = 2.4%)
  nonResidentRate: number;   // Rate for non-residents working in the city
  taxType: 'income' | 'earned_income' | 'wage'; // Type of local tax
  notes?: string;
};

// ============================================
// MICHIGAN CITY INCOME TAXES (24 cities)
// All are flat rate on earned income
// Non-resident rate applies if you work in the city but live elsewhere
// ============================================

export const MICHIGAN_LOCAL_TAXES: Record<string, LocalTaxConfig> = {
  'ALBION': {
    city: 'Albion',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'BATTLE CREEK': {
    city: 'Battle Creek',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'BENTON HARBOR': {
    city: 'Benton Harbor',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'BIG RAPIDS': {
    city: 'Big Rapids',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'DETROIT': {
    city: 'Detroit',
    state: 'MI',
    residentRate: 0.024,
    nonResidentRate: 0.012,
    taxType: 'income',
    notes: 'Highest city tax rate in Michigan',
  },
  'EAST LANSING': {
    city: 'East Lansing',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'FLINT': {
    city: 'Flint',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'GRAND RAPIDS': {
    city: 'Grand Rapids',
    state: 'MI',
    residentRate: 0.015,
    nonResidentRate: 0.0075,
    taxType: 'income',
  },
  'GRAYLING': {
    city: 'Grayling',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'HAMTRAMCK': {
    city: 'Hamtramck',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'HIGHLAND PARK': {
    city: 'Highland Park',
    state: 'MI',
    residentRate: 0.02,
    nonResidentRate: 0.01,
    taxType: 'income',
  },
  'HUDSON': {
    city: 'Hudson',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'IONIA': {
    city: 'Ionia',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'JACKSON': {
    city: 'Jackson',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'LANSING': {
    city: 'Lansing',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'LAPEER': {
    city: 'Lapeer',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'MUSKEGON': {
    city: 'Muskegon',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'MUSKEGON HEIGHTS': {
    city: 'Muskegon Heights',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'PONTIAC': {
    city: 'Pontiac',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'PORT HURON': {
    city: 'Port Huron',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'PORTLAND': {
    city: 'Portland',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'SAGINAW': {
    city: 'Saginaw',
    state: 'MI',
    residentRate: 0.015,
    nonResidentRate: 0.0075,
    taxType: 'income',
  },
  'SPRINGFIELD': {
    city: 'Springfield',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
  'WALKER': {
    city: 'Walker',
    state: 'MI',
    residentRate: 0.01,
    nonResidentRate: 0.005,
    taxType: 'income',
  },
};

// ============================================
// OHIO MUNICIPAL INCOME TAXES (600+ municipalities)
// Ohio cities typically tax residents AND non-residents who work there
// Most cities have the same rate for residents and non-residents
// Credit is usually given for taxes paid to work city
// ============================================

export const OHIO_LOCAL_TAXES: Record<string, LocalTaxConfig> = {
  // Major Cities
  'AKRON': { city: 'Akron', state: 'OH', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income' },
  'CANTON': { city: 'Canton', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'CINCINNATI': { city: 'Cincinnati', state: 'OH', residentRate: 0.021, nonResidentRate: 0.021, taxType: 'income' },
  'CLEVELAND': { city: 'Cleveland', state: 'OH', residentRate: 0.025, nonResidentRate: 0.025, taxType: 'income' },
  'COLUMBUS': { city: 'Columbus', state: 'OH', residentRate: 0.025, nonResidentRate: 0.025, taxType: 'income' },
  'DAYTON': { city: 'Dayton', state: 'OH', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income' },
  'TOLEDO': { city: 'Toledo', state: 'OH', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income' },
  'YOUNGSTOWN': { city: 'Youngstown', state: 'OH', residentRate: 0.0275, nonResidentRate: 0.0275, taxType: 'income' },

  // CCA Member Cities
  'ADA': { city: 'Ada', state: 'OH', residentRate: 0.0165, nonResidentRate: 0.0165, taxType: 'income' },
  'ALGER': { city: 'Alger', state: 'OH', residentRate: 0.01, nonResidentRate: 0.01, taxType: 'income' },
  'BARBERTON': { city: 'Barberton', state: 'OH', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income' },
  'BRATENAHL': { city: 'Bratenahl', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'BURTON': { city: 'Burton', state: 'OH', residentRate: 0.01, nonResidentRate: 0.01, taxType: 'income' },
  'CLAYTON': { city: 'Clayton', state: 'OH', residentRate: 0.015, nonResidentRate: 0.015, taxType: 'income' },
  'DRESDEN': { city: 'Dresden', state: 'OH', residentRate: 0.01, nonResidentRate: 0.01, taxType: 'income' },
  'ELIDA': { city: 'Elida', state: 'OH', residentRate: 0.0075, nonResidentRate: 0.0075, taxType: 'income' },
  'FRAZEYSBURG': { city: 'Frazeysburg', state: 'OH', residentRate: 0.01, nonResidentRate: 0.01, taxType: 'income' },
  'GATES MILLS': { city: 'Gates Mills', state: 'OH', residentRate: 0.01, nonResidentRate: 0.01, taxType: 'income' },
  'GENEVA-ON-THE-LAKE': { city: 'Geneva-on-the-Lake', state: 'OH', residentRate: 0.015, nonResidentRate: 0.015, taxType: 'income' },
  'GERMANTOWN': { city: 'Germantown', state: 'OH', residentRate: 0.015, nonResidentRate: 0.015, taxType: 'income' },
  'GRAND RAPIDS': { city: 'Grand Rapids', state: 'OH', residentRate: 0.01, nonResidentRate: 0.01, taxType: 'income' },
  'GRAND RIVER': { city: 'Grand River', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'HAMILTON': { city: 'Hamilton', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'HIGHLAND HILLS': { city: 'Highland Hills', state: 'OH', residentRate: 0.025, nonResidentRate: 0.025, taxType: 'income' },
  'LINNDALE': { city: 'Linndale', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'LORAIN': { city: 'Lorain', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'MARBLE CLIFF': { city: 'Marble Cliff', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'MENTOR-ON-THE-LAKE': { city: 'Mentor-on-the-Lake', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'MONTPELIER': { city: 'Montpelier', state: 'OH', residentRate: 0.016, nonResidentRate: 0.016, taxType: 'income' },
  'MUNROE FALLS': { city: 'Munroe Falls', state: 'OH', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income' },
  'NEW CARLISLE': { city: 'New Carlisle', state: 'OH', residentRate: 0.015, nonResidentRate: 0.015, taxType: 'income' },
  'NEW MADISON': { city: 'New Madison', state: 'OH', residentRate: 0.01, nonResidentRate: 0.01, taxType: 'income' },
  'NEW MIAMI': { city: 'New Miami', state: 'OH', residentRate: 0.0175, nonResidentRate: 0.0175, taxType: 'income' },
  'NORTH RANDALL': { city: 'North Randall', state: 'OH', residentRate: 0.0275, nonResidentRate: 0.0275, taxType: 'income' },
  'PARMA': { city: 'Parma', state: 'OH', residentRate: 0.025, nonResidentRate: 0.025, taxType: 'income' },
  'PARMA HEIGHTS': { city: 'Parma Heights', state: 'OH', residentRate: 0.03, nonResidentRate: 0.03, taxType: 'income' },
  'RIVERSIDE': { city: 'Riverside', state: 'OH', residentRate: 0.015, nonResidentRate: 0.015, taxType: 'income' },
  'SOUTH RUSSELL': { city: 'South Russell', state: 'OH', residentRate: 0.0125, nonResidentRate: 0.0125, taxType: 'income' },
  'SPRINGFIELD': { city: 'Springfield', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'UNION': { city: 'Union', state: 'OH', residentRate: 0.015, nonResidentRate: 0.015, taxType: 'income' },

  // Additional Major Cities and Suburbs
  'CLEVELAND HEIGHTS': { city: 'Cleveland Heights', state: 'OH', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income' },
  'CUYAHOGA FALLS': { city: 'Cuyahoga Falls', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'ELYRIA': { city: 'Elyria', state: 'OH', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income' },
  'EUCLID': { city: 'Euclid', state: 'OH', residentRate: 0.0285, nonResidentRate: 0.0285, taxType: 'income' },
  'KENT': { city: 'Kent', state: 'OH', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income' },
  'LAKEWOOD': { city: 'Lakewood', state: 'OH', residentRate: 0.015, nonResidentRate: 0.015, taxType: 'income' },
  'MENTOR': { city: 'Mentor', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
  'WARREN': { city: 'Warren', state: 'OH', residentRate: 0.025, nonResidentRate: 0.025, taxType: 'income' },
  'WESTERVILLE': { city: 'Westerville', state: 'OH', residentRate: 0.02, nonResidentRate: 0.02, taxType: 'income' },
};
// ============================================
// PENNSYLVANIA EARNED INCOME TAXES
// Pennsylvania has 3,000+ local taxing jurisdictions
// Philadelphia has the highest rate at 3.74% for residents
// Most PA municipalities have EIT between 0.5% and 2%
// ============================================

export const PENNSYLVANIA_LOCAL_TAXES: Record<string, LocalTaxConfig> = {
  // Major Cities
  'PHILADELPHIA': {
    city: 'Philadelphia',
    state: 'PA',
    residentRate: 0.0374,     // 3.74% as of July 1, 2025
    nonResidentRate: 0.0343,  // 3.43% as of July 1, 2025
    taxType: 'wage',
    notes: 'Highest local tax rate in PA. Rate reduced from 3.75%/3.44% on 7/1/2025',
  },
  'PITTSBURGH': {
    city: 'Pittsburgh',
    state: 'PA',
    residentRate: 0.03,
    nonResidentRate: 0.03,
    taxType: 'earned_income',
  },
  'READING': {
    city: 'Reading',
    state: 'PA',
    residentRate: 0.036,
    nonResidentRate: 0.036,
    taxType: 'earned_income',
  },
  'SCRANTON': {
    city: 'Scranton',
    state: 'PA',
    residentRate: 0.034,
    nonResidentRate: 0.034,
    taxType: 'earned_income',
  },
  'WILKES BARRE': {
    city: 'Wilkes Barre',
    state: 'PA',
    residentRate: 0.03,
    nonResidentRate: 0.03,
    taxType: 'earned_income',
  },
  'ALLENTOWN': {
    city: 'Allentown',
    state: 'PA',
    residentRate: 0.0135,
    nonResidentRate: 0.0135,
    taxType: 'earned_income',
  },
  'ALTOONA': {
    city: 'Altoona',
    state: 'PA',
    residentRate: 0.012,
    nonResidentRate: 0.012,
    taxType: 'earned_income',
  },
  'BETHLEHEM': {
    city: 'Bethlehem',
    state: 'PA',
    residentRate: 0.01,
    nonResidentRate: 0.01,
    taxType: 'earned_income',
  },
  'ERIE': {
    city: 'Erie',
    state: 'PA',
    residentRate: 0.0118,
    nonResidentRate: 0.0118,
    taxType: 'earned_income',
  },
  'HARRISBURG': {
    city: 'Harrisburg',
    state: 'PA',
    residentRate: 0.01,
    nonResidentRate: 0.01,
    taxType: 'earned_income',
  },
  'LANCASTER': {
    city: 'Lancaster',
    state: 'PA',
    residentRate: 0.011,
    nonResidentRate: 0.011,
    taxType: 'earned_income',
  },
  'YORK': {
    city: 'York',
    state: 'PA',
    residentRate: 0.01,
    nonResidentRate: 0.01,
    taxType: 'earned_income',
  },
};
// ============================================
// NEW YORK LOCAL INCOME TAXES
// Only NYC and Yonkers have local income taxes in NY
// NYC has progressive brackets (3.078% - 3.876%)
// Yonkers is 16.75% of net state tax for residents
// ============================================

export const NEW_YORK_LOCAL_TAXES: Record<string, LocalTaxConfig> = {
  // NYC includes: Manhattan, Brooklyn, Queens, Bronx, Staten Island
  'NEW YORK CITY': {
    city: 'New York City',
    state: 'NY',
    residentRate: 0.03876,    // Highest bracket rate (progressive 3.078% - 3.876%)
    nonResidentRate: 0,       // Non-residents don't pay NYC tax
    taxType: 'income',
    notes: 'Progressive tax: 3.078% under $12k, 3.762% $12k-$25k, 3.819% $25k-$50k, 3.876% over $50k',
  },
  'MANHATTAN': {
    city: 'Manhattan',
    state: 'NY',
    residentRate: 0.03876,
    nonResidentRate: 0,
    taxType: 'income',
    notes: 'Part of NYC - same rates apply',
  },
  'BROOKLYN': {
    city: 'Brooklyn',
    state: 'NY',
    residentRate: 0.03876,
    nonResidentRate: 0,
    taxType: 'income',
    notes: 'Part of NYC - same rates apply',
  },
  'QUEENS': {
    city: 'Queens',
    state: 'NY',
    residentRate: 0.03876,
    nonResidentRate: 0,
    taxType: 'income',
    notes: 'Part of NYC - same rates apply',
  },
  'BRONX': {
    city: 'Bronx',
    state: 'NY',
    residentRate: 0.03876,
    nonResidentRate: 0,
    taxType: 'income',
    notes: 'Part of NYC - same rates apply',
  },
  'STATEN ISLAND': {
    city: 'Staten Island',
    state: 'NY',
    residentRate: 0.03876,
    nonResidentRate: 0,
    taxType: 'income',
    notes: 'Part of NYC - same rates apply',
  },
  'YONKERS': {
    city: 'Yonkers',
    state: 'NY',
    residentRate: 0.01675,    // 16.75% of net state tax - approximated as flat rate
    nonResidentRate: 0.005,   // 0.5% of wages for non-residents
    taxType: 'income',
    notes: 'Resident: 16.75% of net NY state tax. Non-resident: 0.5% of wages',
  },
};
// ============================================
// INDIANA COUNTY INCOME TAXES (All 92 counties)
// Indiana taxes based on RESIDENCE county, not work location
// Non-residents don't pay county tax - they pay their own county
// Rates effective 2024/2025 (source: SmartAsset/IN DOR)
// ============================================

export const INDIANA_LOCAL_TAXES: Record<string, LocalTaxConfig> = {
  'ADAMS': { city: 'Adams County', state: 'IN', residentRate: 0.0160, nonResidentRate: 0, taxType: 'income' },
  'ALLEN': { city: 'Allen County', state: 'IN', residentRate: 0.0159, nonResidentRate: 0, taxType: 'income' },
  'BARTHOLOMEW': { city: 'Bartholomew County', state: 'IN', residentRate: 0.0175, nonResidentRate: 0, taxType: 'income' },
  'BENTON': { city: 'Benton County', state: 'IN', residentRate: 0.0179, nonResidentRate: 0, taxType: 'income' },
  'BLACKFORD': { city: 'Blackford County', state: 'IN', residentRate: 0.0250, nonResidentRate: 0, taxType: 'income' },
  'BOONE': { city: 'Boone County', state: 'IN', residentRate: 0.0170, nonResidentRate: 0, taxType: 'income' },
  'BROWN': { city: 'Brown County', state: 'IN', residentRate: 0.0252, nonResidentRate: 0, taxType: 'income' },
  'CARROLL': { city: 'Carroll County', state: 'IN', residentRate: 0.0227, nonResidentRate: 0, taxType: 'income' },
  'CASS': { city: 'Cass County', state: 'IN', residentRate: 0.0295, nonResidentRate: 0, taxType: 'income' },
  'CLARK': { city: 'Clark County', state: 'IN', residentRate: 0.0200, nonResidentRate: 0, taxType: 'income' },
  'CLAY': { city: 'Clay County', state: 'IN', residentRate: 0.0235, nonResidentRate: 0, taxType: 'income' },
  'CLINTON': { city: 'Clinton County', state: 'IN', residentRate: 0.0265, nonResidentRate: 0, taxType: 'income' },
  'CRAWFORD': { city: 'Crawford County', state: 'IN', residentRate: 0.0165, nonResidentRate: 0, taxType: 'income' },
  'DAVIESS': { city: 'Daviess County', state: 'IN', residentRate: 0.0150, nonResidentRate: 0, taxType: 'income' },
  'DEARBORN': { city: 'Dearborn County', state: 'IN', residentRate: 0.0140, nonResidentRate: 0, taxType: 'income' },
  'DECATUR': { city: 'Decatur County', state: 'IN', residentRate: 0.0245, nonResidentRate: 0, taxType: 'income' },
  'DEKALB': { city: 'DeKalb County', state: 'IN', residentRate: 0.0213, nonResidentRate: 0, taxType: 'income' },
  'DELAWARE': { city: 'Delaware County', state: 'IN', residentRate: 0.0150, nonResidentRate: 0, taxType: 'income' },
  'DUBOIS': { city: 'Dubois County', state: 'IN', residentRate: 0.0120, nonResidentRate: 0, taxType: 'income' },
  'ELKHART': { city: 'Elkhart County', state: 'IN', residentRate: 0.0200, nonResidentRate: 0, taxType: 'income' },
  'FAYETTE': { city: 'Fayette County', state: 'IN', residentRate: 0.0282, nonResidentRate: 0, taxType: 'income' },
  'FLOYD': { city: 'Floyd County', state: 'IN', residentRate: 0.0139, nonResidentRate: 0, taxType: 'income' },
  'FOUNTAIN': { city: 'Fountain County', state: 'IN', residentRate: 0.0210, nonResidentRate: 0, taxType: 'income' },
  'FRANKLIN': { city: 'Franklin County', state: 'IN', residentRate: 0.0170, nonResidentRate: 0, taxType: 'income' },
  'FULTON': { city: 'Fulton County', state: 'IN', residentRate: 0.0288, nonResidentRate: 0, taxType: 'income' },
  'GIBSON': { city: 'Gibson County', state: 'IN', residentRate: 0.0090, nonResidentRate: 0, taxType: 'income' },
  'GRANT': { city: 'Grant County', state: 'IN', residentRate: 0.0255, nonResidentRate: 0, taxType: 'income' },
  'GREENE': { city: 'Greene County', state: 'IN', residentRate: 0.0215, nonResidentRate: 0, taxType: 'income' },
  'HAMILTON': { city: 'Hamilton County', state: 'IN', residentRate: 0.0110, nonResidentRate: 0, taxType: 'income' },
  'HANCOCK': { city: 'Hancock County', state: 'IN', residentRate: 0.0194, nonResidentRate: 0, taxType: 'income' },
  'HARRISON': { city: 'Harrison County', state: 'IN', residentRate: 0.0100, nonResidentRate: 0, taxType: 'income' },
  'HENDRICKS': { city: 'Hendricks County', state: 'IN', residentRate: 0.0170, nonResidentRate: 0, taxType: 'income' },
  'HENRY': { city: 'Henry County', state: 'IN', residentRate: 0.0202, nonResidentRate: 0, taxType: 'income' },
  'HOWARD': { city: 'Howard County', state: 'IN', residentRate: 0.0195, nonResidentRate: 0, taxType: 'income' },
  'HUNTINGTON': { city: 'Huntington County', state: 'IN', residentRate: 0.0195, nonResidentRate: 0, taxType: 'income' },
  'JACKSON': { city: 'Jackson County', state: 'IN', residentRate: 0.0210, nonResidentRate: 0, taxType: 'income' },
  'JASPER': { city: 'Jasper County', state: 'IN', residentRate: 0.0286, nonResidentRate: 0, taxType: 'income' },
  'JAY': { city: 'Jay County', state: 'IN', residentRate: 0.0245, nonResidentRate: 0, taxType: 'income' },
  'JEFFERSON': { city: 'Jefferson County', state: 'IN', residentRate: 0.0103, nonResidentRate: 0, taxType: 'income' },
  'JENNINGS': { city: 'Jennings County', state: 'IN', residentRate: 0.0250, nonResidentRate: 0, taxType: 'income' },
  'JOHNSON': { city: 'Johnson County', state: 'IN', residentRate: 0.0140, nonResidentRate: 0, taxType: 'income' },
  'KNOX': { city: 'Knox County', state: 'IN', residentRate: 0.0170, nonResidentRate: 0, taxType: 'income' },
  'KOSCIUSKO': { city: 'Kosciusko County', state: 'IN', residentRate: 0.0100, nonResidentRate: 0, taxType: 'income' },
  'LAGRANGE': { city: 'LaGrange County', state: 'IN', residentRate: 0.0165, nonResidentRate: 0, taxType: 'income' },
  'LAKE': { city: 'Lake County', state: 'IN', residentRate: 0.0150, nonResidentRate: 0, taxType: 'income' },
  'LAPORTE': { city: 'LaPorte County', state: 'IN', residentRate: 0.0145, nonResidentRate: 0, taxType: 'income' },
  'LAWRENCE': { city: 'Lawrence County', state: 'IN', residentRate: 0.0175, nonResidentRate: 0, taxType: 'income' },
  'MADISON': { city: 'Madison County', state: 'IN', residentRate: 0.0225, nonResidentRate: 0, taxType: 'income' },
  'MARION': { city: 'Marion County', state: 'IN', residentRate: 0.0202, nonResidentRate: 0, taxType: 'income', notes: 'Indianapolis' },
  'MARSHALL': { city: 'Marshall County', state: 'IN', residentRate: 0.0125, nonResidentRate: 0, taxType: 'income' },
  'MARTIN': { city: 'Martin County', state: 'IN', residentRate: 0.0180, nonResidentRate: 0, taxType: 'income' },
  'MIAMI': { city: 'Miami County', state: 'IN', residentRate: 0.0234, nonResidentRate: 0, taxType: 'income' },
  'MONROE': { city: 'Monroe County', state: 'IN', residentRate: 0.0135, nonResidentRate: 0, taxType: 'income', notes: 'Bloomington' },
  'MONTGOMERY': { city: 'Montgomery County', state: 'IN', residentRate: 0.0234, nonResidentRate: 0, taxType: 'income' },
  'MORGAN': { city: 'Morgan County', state: 'IN', residentRate: 0.0268, nonResidentRate: 0, taxType: 'income' },
  'NEWTON': { city: 'Newton County', state: 'IN', residentRate: 0.0195, nonResidentRate: 0, taxType: 'income' },
  'NOBLE': { city: 'Noble County', state: 'IN', residentRate: 0.0175, nonResidentRate: 0, taxType: 'income' },
  'OHIO': { city: 'Ohio County', state: 'IN', residentRate: 0.0120, nonResidentRate: 0, taxType: 'income' },
  'ORANGE': { city: 'Orange County', state: 'IN', residentRate: 0.0250, nonResidentRate: 0, taxType: 'income' },
  'OWEN': { city: 'Owen County', state: 'IN', residentRate: 0.0200, nonResidentRate: 0, taxType: 'income' },
  'PARKE': { city: 'Parke County', state: 'IN', residentRate: 0.0268, nonResidentRate: 0, taxType: 'income' },
  'PERRY': { city: 'Perry County', state: 'IN', residentRate: 0.0140, nonResidentRate: 0, taxType: 'income' },
  'PIKE': { city: 'Pike County', state: 'IN', residentRate: 0.0120, nonResidentRate: 0, taxType: 'income' },
  'PORTER': { city: 'Porter County', state: 'IN', residentRate: 0.0050, nonResidentRate: 0, taxType: 'income', notes: 'Lowest county rate in Indiana' },
  'POSEY': { city: 'Posey County', state: 'IN', residentRate: 0.0145, nonResidentRate: 0, taxType: 'income' },
  'PULASKI': { city: 'Pulaski County', state: 'IN', residentRate: 0.0285, nonResidentRate: 0, taxType: 'income' },
  'PUTNAM': { city: 'Putnam County', state: 'IN', residentRate: 0.0230, nonResidentRate: 0, taxType: 'income' },
  'RANDOLPH': { city: 'Randolph County', state: 'IN', residentRate: 0.0300, nonResidentRate: 0, taxType: 'income', notes: 'Highest county rate in Indiana' },
  'RIPLEY': { city: 'Ripley County', state: 'IN', residentRate: 0.0238, nonResidentRate: 0, taxType: 'income' },
  'RUSH': { city: 'Rush County', state: 'IN', residentRate: 0.0210, nonResidentRate: 0, taxType: 'income' },
  'ST. JOSEPH': { city: 'St. Joseph County', state: 'IN', residentRate: 0.0175, nonResidentRate: 0, taxType: 'income', notes: 'South Bend' },
  'SCOTT': { city: 'Scott County', state: 'IN', residentRate: 0.0216, nonResidentRate: 0, taxType: 'income' },
  'SHELBY': { city: 'Shelby County', state: 'IN', residentRate: 0.0160, nonResidentRate: 0, taxType: 'income' },
  'SPENCER': { city: 'Spencer County', state: 'IN', residentRate: 0.0080, nonResidentRate: 0, taxType: 'income' },
  'STARKE': { city: 'Starke County', state: 'IN', residentRate: 0.0171, nonResidentRate: 0, taxType: 'income' },
  'STEUBEN': { city: 'Steuben County', state: 'IN', residentRate: 0.0199, nonResidentRate: 0, taxType: 'income' },
  'SULLIVAN': { city: 'Sullivan County', state: 'IN', residentRate: 0.0170, nonResidentRate: 0, taxType: 'income' },
  'SWITZERLAND': { city: 'Switzerland County', state: 'IN', residentRate: 0.0125, nonResidentRate: 0, taxType: 'income' },
  'TIPPECANOE': { city: 'Tippecanoe County', state: 'IN', residentRate: 0.0128, nonResidentRate: 0, taxType: 'income', notes: 'Lafayette/West Lafayette' },
  'TIPTON': { city: 'Tipton County', state: 'IN', residentRate: 0.0260, nonResidentRate: 0, taxType: 'income' },
  'UNION': { city: 'Union County', state: 'IN', residentRate: 0.0200, nonResidentRate: 0, taxType: 'income' },
  'VANDERBURGH': { city: 'Vanderburgh County', state: 'IN', residentRate: 0.0125, nonResidentRate: 0, taxType: 'income', notes: 'Evansville' },
  'VERMILLION': { city: 'Vermillion County', state: 'IN', residentRate: 0.0150, nonResidentRate: 0, taxType: 'income' },
  'VIGO': { city: 'Vigo County', state: 'IN', residentRate: 0.0200, nonResidentRate: 0, taxType: 'income', notes: 'Terre Haute' },
  'WABASH': { city: 'Wabash County', state: 'IN', residentRate: 0.0290, nonResidentRate: 0, taxType: 'income' },
  'WARREN': { city: 'Warren County', state: 'IN', residentRate: 0.0212, nonResidentRate: 0, taxType: 'income' },
  'WARRICK': { city: 'Warrick County', state: 'IN', residentRate: 0.0100, nonResidentRate: 0, taxType: 'income' },
  'WASHINGTON': { city: 'Washington County', state: 'IN', residentRate: 0.0200, nonResidentRate: 0, taxType: 'income' },
  'WAYNE': { city: 'Wayne County', state: 'IN', residentRate: 0.0125, nonResidentRate: 0, taxType: 'income' },
  'WELLS': { city: 'Wells County', state: 'IN', residentRate: 0.0210, nonResidentRate: 0, taxType: 'income' },
  'WHITE': { city: 'White County', state: 'IN', residentRate: 0.0232, nonResidentRate: 0, taxType: 'income' },
  'WHITLEY': { city: 'Whitley County', state: 'IN', residentRate: 0.0168, nonResidentRate: 0, taxType: 'income' },
};
// ============================================
// MARYLAND COUNTY INCOME TAXES (23 counties + Baltimore City)
// Maryland taxes based on RESIDENCE county, not work location
// Non-residents don't pay county tax - they pay their own county
// Rates effective 2025 (source: MD Comptroller)
// Some counties have bracket-based rates - using highest bracket as approximation
// ============================================

export const MARYLAND_LOCAL_TAXES: Record<string, LocalTaxConfig> = {
  'ALLEGANY': { city: 'Allegany County', state: 'MD', residentRate: 0.0303, nonResidentRate: 0, taxType: 'income' },
  'ANNE ARUNDEL': { city: 'Anne Arundel County', state: 'MD', residentRate: 0.0294, nonResidentRate: 0, taxType: 'income', notes: 'Bracket-based: 2.70% up to $50k, 2.94% over' },
  'BALTIMORE COUNTY': { city: 'Baltimore County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'BALTIMORE CITY': { city: 'Baltimore City', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'CALVERT': { city: 'Calvert County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'CAROLINE': { city: 'Caroline County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'CARROLL': { city: 'Carroll County', state: 'MD', residentRate: 0.0303, nonResidentRate: 0, taxType: 'income' },
  'CECIL': { city: 'Cecil County', state: 'MD', residentRate: 0.0274, nonResidentRate: 0, taxType: 'income' },
  'CHARLES': { city: 'Charles County', state: 'MD', residentRate: 0.0303, nonResidentRate: 0, taxType: 'income' },
  'DORCHESTER': { city: 'Dorchester County', state: 'MD', residentRate: 0.0330, nonResidentRate: 0, taxType: 'income', notes: 'Highest rate in Maryland (new 2025 cap)' },
  'FREDERICK': { city: 'Frederick County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income', notes: 'Bracket-based: 2.25% to 3.20% depending on income' },
  'GARRETT': { city: 'Garrett County', state: 'MD', residentRate: 0.0265, nonResidentRate: 0, taxType: 'income' },
  'HARFORD': { city: 'Harford County', state: 'MD', residentRate: 0.0306, nonResidentRate: 0, taxType: 'income' },
  'HOWARD': { city: 'Howard County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'KENT': { city: 'Kent County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'MONTGOMERY': { city: 'Montgomery County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'PRINCE GEORGES': { city: "Prince George's County", state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'QUEEN ANNES': { city: "Queen Anne's County", state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'ST. MARYS': { city: "St. Mary's County", state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'SOMERSET': { city: 'Somerset County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'TALBOT': { city: 'Talbot County', state: 'MD', residentRate: 0.0240, nonResidentRate: 0, taxType: 'income' },
  'WASHINGTON': { city: 'Washington County', state: 'MD', residentRate: 0.0295, nonResidentRate: 0, taxType: 'income' },
  'WICOMICO': { city: 'Wicomico County', state: 'MD', residentRate: 0.0320, nonResidentRate: 0, taxType: 'income' },
  'WORCESTER': { city: 'Worcester County', state: 'MD', residentRate: 0.0225, nonResidentRate: 0, taxType: 'income', notes: 'Lowest rate in Maryland' },
};
// ============================================
// KENTUCKY LOCAL OCCUPATIONAL TAXES (87 counties + cities)
// Kentucky has BOTH county AND city taxes - they can stack!
// Both residents AND non-residents working in a jurisdiction pay the tax
// Rates effective 2024/2025 (source: KACO, NFC, city websites)
// ============================================

export const KENTUCKY_LOCAL_TAXES: Record<string, LocalTaxConfig> = {
  // Major Cities
  'LOUISVILLE': { city: 'Louisville', state: 'KY', residentRate: 0.0220, nonResidentRate: 0.0145, taxType: 'income', notes: 'Jefferson County Metro - 2.2% resident, 1.45% non-resident' },
  'LEXINGTON': { city: 'Lexington', state: 'KY', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income', notes: 'Fayette County - same rate for all workers' },
  'BOWLING GREEN': { city: 'Bowling Green', state: 'KY', residentRate: 0.0200, nonResidentRate: 0.0200, taxType: 'income', notes: 'City rate only - Warren County adds 1%' },
  'COVINGTON': { city: 'Covington', state: 'KY', residentRate: 0.0245, nonResidentRate: 0.0245, taxType: 'income' },
  'FRANKFORT': { city: 'Frankfort', state: 'KY', residentRate: 0.0200, nonResidentRate: 0.0200, taxType: 'income' },
  'OWENSBORO': { city: 'Owensboro', state: 'KY', residentRate: 0.0150, nonResidentRate: 0.0150, taxType: 'income' },
  'HENDERSON': { city: 'Henderson', state: 'KY', residentRate: 0.0150, nonResidentRate: 0.0150, taxType: 'income' },
  'RICHMOND': { city: 'Richmond', state: 'KY', residentRate: 0.0200, nonResidentRate: 0.0200, taxType: 'income' },
  'GEORGETOWN': { city: 'Georgetown', state: 'KY', residentRate: 0.0150, nonResidentRate: 0.0150, taxType: 'income' },
  'FLORENCE': { city: 'Florence', state: 'KY', residentRate: 0.0200, nonResidentRate: 0.0200, taxType: 'income' },
  'ELIZABETHTOWN': { city: 'Elizabethtown', state: 'KY', residentRate: 0.0150, nonResidentRate: 0.0150, taxType: 'income' },
  'NICHOLASVILLE': { city: 'Nicholasville', state: 'KY', residentRate: 0.0150, nonResidentRate: 0.0150, taxType: 'income' },
  'HOPKINSVILLE': { city: 'Hopkinsville', state: 'KY', residentRate: 0.0200, nonResidentRate: 0.0200, taxType: 'income' },
  'PADUCAH': { city: 'Paducah', state: 'KY', residentRate: 0.0200, nonResidentRate: 0.0200, taxType: 'income' },
  'ASHLAND': { city: 'Ashland', state: 'KY', residentRate: 0.0200, nonResidentRate: 0.0200, taxType: 'income' },

  // Major Counties (in addition to city taxes if applicable)
  'JEFFERSON COUNTY': { city: 'Jefferson County', state: 'KY', residentRate: 0.0220, nonResidentRate: 0.0145, taxType: 'income', notes: 'Louisville Metro' },
  'FAYETTE COUNTY': { city: 'Fayette County', state: 'KY', residentRate: 0.0225, nonResidentRate: 0.0225, taxType: 'income', notes: 'Lexington' },
  'KENTON COUNTY': { city: 'Kenton County', state: 'KY', residentRate: 0.006997, nonResidentRate: 0.006997, taxType: 'income', notes: 'Max wage base $176,100' },
  'BOONE COUNTY': { city: 'Boone County', state: 'KY', residentRate: 0.0080, nonResidentRate: 0.0080, taxType: 'income', notes: 'Max wage base $77,400' },
  'CAMPBELL COUNTY': { city: 'Campbell County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'WARREN COUNTY': { city: 'Warren County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income', notes: 'Add to Bowling Green city rate if applicable' },
  'MADISON COUNTY': { city: 'Madison County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'MCCRACKEN COUNTY': { city: 'McCracken County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'MCCREARY COUNTY': { city: 'McCreary County', state: 'KY', residentRate: 0.0150, nonResidentRate: 0.0150, taxType: 'income' },
  'CLAY COUNTY': { city: 'Clay County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'HARDIN COUNTY': { city: 'Hardin County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'DAVIESS COUNTY': { city: 'Daviess County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income', notes: 'Owensboro area' },
  'CHRISTIAN COUNTY': { city: 'Christian County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'BOYD COUNTY': { city: 'Boyd County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income', notes: 'Ashland area' },
  'SCOTT COUNTY': { city: 'Scott County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income', notes: 'Georgetown area' },
  'JESSAMINE COUNTY': { city: 'Jessamine County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income', notes: 'Nicholasville area' },
  'HENDERSON COUNTY': { city: 'Henderson County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'FRANKLIN COUNTY': { city: 'Franklin County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income', notes: 'Frankfort area' },
  'PIKE COUNTY': { city: 'Pike County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'PULASKI COUNTY': { city: 'Pulaski County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'LAUREL COUNTY': { city: 'Laurel County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'BULLITT COUNTY': { city: 'Bullitt County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'NELSON COUNTY': { city: 'Nelson County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'GRAVES COUNTY': { city: 'Graves County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'HOPKINS COUNTY': { city: 'Hopkins County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'GREENUP COUNTY': { city: 'Greenup County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'CLARK COUNTY': { city: 'Clark County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'MUHLENBERG COUNTY': { city: 'Muhlenberg County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'WHITLEY COUNTY': { city: 'Whitley County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'BELL COUNTY': { city: 'Bell County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'FLOYD COUNTY': { city: 'Floyd County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'PERRY COUNTY': { city: 'Perry County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'KNOX COUNTY': { city: 'Knox County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'LETCHER COUNTY': { city: 'Letcher County', state: 'KY', residentRate: 0.0100, nonResidentRate: 0.0100, taxType: 'income' },
  'HARLAN COUNTY': { city: 'Harlan County', state: 'KY', residentRate: 0.0150, nonResidentRate: 0.0150, taxType: 'income' },
};

// Master lookup by state
export const LOCAL_TAX_BY_STATE: Record<string, Record<string, LocalTaxConfig>> = {
  MI: MICHIGAN_LOCAL_TAXES,
  OH: OHIO_LOCAL_TAXES,
  PA: PENNSYLVANIA_LOCAL_TAXES,
  NY: NEW_YORK_LOCAL_TAXES,
  IN: INDIANA_LOCAL_TAXES,
  MD: MARYLAND_LOCAL_TAXES,
  KY: KENTUCKY_LOCAL_TAXES,
};

/**
 * Get local tax configuration for a city
 * @param state - Two-letter state code (e.g., 'MI')
 * @param city - City name (case-insensitive)
 * @returns LocalTaxConfig or null if no local tax
 */
export function getLocalTaxConfig(state: string, city: string): LocalTaxConfig | null {
  const stateUpper = (state || '').toUpperCase();
  const cityUpper = (city || '').toUpperCase().trim();

  const stateTaxes = LOCAL_TAX_BY_STATE[stateUpper];
  if (!stateTaxes) return null;

  return stateTaxes[cityUpper] || null;
}

/**
 * Calculate local tax based on residence and work location
 * @param annualIncome - Annual taxable income
 * @param residenceState - State where employee lives
 * @param residenceCity - City where employee lives
 * @param workState - State where employee works
 * @param workCity - City where employee works
 * @returns Annual local tax amount
 */
export function calculateLocalTax(
  annualIncome: number,
  residenceState: string,
  residenceCity: string,
  workState?: string,
  workCity?: string
): number {
  let totalLocalTax = 0;

  // Check residence city tax
  const residenceConfig = getLocalTaxConfig(residenceState, residenceCity);
  if (residenceConfig) {
    totalLocalTax += annualIncome * residenceConfig.residentRate;
  }

  // Check work city tax (if different from residence and has non-resident rate)
  if (workCity && workState) {
    const workCityUpper = workCity.toUpperCase().trim();
    const residenceCityUpper = residenceCity.toUpperCase().trim();

    // Only apply work city tax if it's a different city
    if (workCityUpper !== residenceCityUpper || workState.toUpperCase() !== residenceState.toUpperCase()) {
      const workConfig = getLocalTaxConfig(workState, workCity);
      if (workConfig) {
        totalLocalTax += annualIncome * workConfig.nonResidentRate;
      }
    }
  }

  return totalLocalTax;
}

/**
 * Get list of cities with local taxes for a state
 */
export function getCitiesWithLocalTax(state: string): string[] {
  const stateUpper = (state || '').toUpperCase();
  const stateTaxes = LOCAL_TAX_BY_STATE[stateUpper];
  if (!stateTaxes) return [];
  return Object.keys(stateTaxes);
}

/**
 * Check if a state has any local income taxes
 */
export function stateHasLocalTax(state: string): boolean {
  const stateUpper = (state || '').toUpperCase();
  const stateTaxes = LOCAL_TAX_BY_STATE[stateUpper];
  return stateTaxes && Object.keys(stateTaxes).length > 0;
}
