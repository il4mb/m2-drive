// indonesian-animal-names.ts

// Arrays of Indonesian animal names
const indonesianAnimals = {
    mammals: [
        'Harimau', 'Gajah', 'Orangutan', 'Badak', 'Kancil',
        'Kucing', 'Anjing', 'Monyet', 'Babi', 'Rusa',
        'Kijang', 'Kerbau', 'Kuda', 'Sapi', 'Kambing',
        'Tikus', 'Bajing', 'Landak', 'Trenggiling', 'Kelelawar',
        'Luwak', 'Beruang', 'Singa', 'Macan', 'Kukang'
    ],
    birds: [
        'Elang', 'Rajawali', 'Kakatua', 'Nuri', 'Merak',
        'Jalak', 'Cendrawasih', 'Kutilang', 'Perkutut', 'Merpati',
        'Gagak', 'Bangau', 'Kuntul', 'Itik', 'Angsa',
        'Ayam', 'Burung Hantu', 'Pelatuk', 'Manyar', 'Pipit'
    ],
    reptiles: [
        'Ular', 'Kadal', 'Biawak', 'Buaya', 'Kura-kura',
        'Penyu', 'Tokek', 'Cecak', 'Bunglon', 'Komodo'
    ],
    aquatic: [
        'Ikan', 'Hiu', 'Pari', 'Gurita', 'Cumi-cumi',
        'Udang', 'Kepiting', 'Rajungan', 'Kuda Laut', 'Bintang Laut',
        'Teripang', 'Lumba-lumba', 'Paus', 'Penyu', 'Sotong'
    ],
    insects: [
        'Kupu-kupu', 'Lebah', 'Tawon', 'Semut', 'Laba-laba',
        'Belalang', 'Jangkrik', 'Kecoak', 'Nyamuk', 'Lalat',
        'Capung', 'Kumbang', 'Ulat', 'Kutu', 'Undur-undur'
    ]
};

// Adjectives to combine with animal names (Indonesian order: noun + adjective)
const indonesianAdjectives = [
    'Besar', 'Kecil', 'Cepat', 'Lambat', 'Pintar',
    'Bodoh', 'Ganas', 'Jinak', 'Liar', 'Lucu',
    'Menakutkan', 'Warna-warni', 'Gemas', 'Eksotis',
    'Langka', 'Terancam', 'Endemik', 'Unik', 'Misterius',
    'Gendut', 'Kurus', 'Tinggi', 'Rendah', 'Pendek',
    'Berbulu', 'Bersisik', 'Berkaki', 'Bermata', 'Bersuara'
];

// Indonesian habitats/environments
const indonesianHabitats = [
    'Hutan', 'Laut', 'Sungai', 'Danau', 'Rawa',
    'Gunung', 'Pantai', 'Savana', 'Kebun', 'Sawah',
    'Goa', 'Pohon', 'Tebing', 'Padang Rumput', 'Mangrove',
    'Terumbu Karang', 'Rawa Bakau', 'Hutan Hujan', 'Hutan Bakau', 'Padang Pasir'
];

// Indonesian regions/islands
const indonesianRegions = [
    'Sumatra', 'Jawa', 'Kalimantan', 'Sulawesi', 'Papua',
    'Bali', 'Lombok', 'Sumatera', 'Borneo', 'Sunda',
    'Maluku', 'Nusa Tenggara', 'Kepulauan Riau', 'Bangka Belitung', 'Sumbawa',
    'Flores', 'Timor', 'Halmahera', 'Seram', 'Buru'
];

// Config options
export interface NameGeneratorConfig {
    style?: 'simple' | 'descriptive' | 'scientific';
    separator?: string;
    capitalize?: boolean;
    useAdjective?: boolean;
    useHabitat?: boolean;
    useRegion?: boolean;
}

// Default config
const defaultConfig: NameGeneratorConfig = {
    style: 'descriptive',
    separator: ' ',
    capitalize: true,
    useAdjective: true,
    useHabitat: false,
    useRegion: false
};

/**
 * Gets a random element from an array
 */
function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Gets a random key from an object
 */
function getRandomKey(obj: Record<string, any>): string {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * Generates a random Indonesian animal name
 * @param config Configuration options for name generation
 * @returns A randomly generated Indonesian animal name
 */
export function generateIndonesianAnimalName(config?: NameGeneratorConfig): string {
    const mergedConfig = { ...defaultConfig, ...config };

    // Get random animal
    const animalType = getRandomKey(indonesianAnimals);
    // @ts-ignore
    const animal = getRandomElement(indonesianAnimals[animalType]);

    let nameParts: string[] = [];

    // Always add the animal name first (Indonesian order: noun + adjective)
    // @ts-ignore
    nameParts.push(animal);

    // Add adjective if enabled (70% chance if enabled)
    if (mergedConfig.useAdjective && Math.random() > 0.3) {
        const adjective = getRandomElement(indonesianAdjectives);
        nameParts.push(adjective);
    }

    // Add habitat if enabled (40% chance if enabled)
    if (mergedConfig.useHabitat && Math.random() > 0.6) {
        const habitat = getRandomElement(indonesianHabitats);
        nameParts.push(habitat);
    }

    // Add region if enabled (30% chance if enabled)
    if (mergedConfig.useRegion && Math.random() > 0.7) {
        const region = getRandomElement(indonesianRegions);
        nameParts.push(region);
    }

    // Apply style
    let result: string;

    switch (mergedConfig.style) {
        case 'simple':
            // @ts-ignore
            result = animal; // Just the animal name
            break;

        case 'scientific':
            // Create a scientific-sounding name
            const scientificParts = [
                getRandomElement(['Paradoxurus', 'Panthera', 'Elephas', 'Rhinoceros', 'Pongo']),
                // @ts-ignore
                animal.toLowerCase()
            ];
            result = scientificParts.join(' ');
            break;

        case 'descriptive':
        default:
            result = nameParts.join(mergedConfig.separator);
    }

    // Apply capitalization
    if (mergedConfig.capitalize) {
        if (mergedConfig.style === 'scientific') {
            // Scientific names have specific capitalization
            result = result
                .split(' ')
                .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        } else {
            result = result
                // @ts-ignore
                .split(mergedConfig.separator)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(mergedConfig.separator);
        }
    }

    return result;
}

/**
 * Generates multiple Indonesian animal names
 * @param count Number of names to generate
 * @param config Configuration options for name generation
 * @returns Array of randomly generated Indonesian animal names
 */
export function generateIndonesianAnimalNames(count: number, config?: NameGeneratorConfig): string[] {
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
        names.push(generateIndonesianAnimalName(config));
    }

    return names;
}

// Additional utility functions

/**
 * Gets all available animal types
 */
export function getAnimalTypes(): string[] {
    return Object.keys(indonesianAnimals);
}

/**
 * Gets all animals of a specific type
 */
export function getAnimalsByType(type: string): string[] {
    // @ts-ignore
    return indonesianAnimals[type] || [];
}

/**
 * Gets a random animal of a specific type
 */
export function getRandomAnimalByType(type: string): string {
    const animals = getAnimalsByType(type);
    return animals.length > 0 ? getRandomElement(animals) : '';
}