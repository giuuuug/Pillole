/**
 * Categorie di serie (gli "scaffali" della libreria).
 *
 * Ogni coppia `color` / `onColor` e' stata scelta con contrasto >= 4.5:1,
 * cosi' un chip categoria resta leggibile sia in tema chiaro che scuro.
 * `icon` e' il nome di un'icona in `$lib/components/Icon.svelte` — mai un'emoji:
 * le emoji cambiano forma per piattaforma e gli screen reader le leggono male.
 */
export type CategorySeed = {
	id: string;
	label: string;
	description: string;
	icon: string;
	color: string;
	onColor: string;
	sortOrder: number;
};

export const CATEGORIES: readonly CategorySeed[] = [
	{
		id: 'matematica',
		label: 'Matematica',
		description: 'Numeri, dimostrazioni, strutture e formule.',
		icon: 'sigma',
		color: '#1D4ED8',
		onColor: '#FFFFFF',
		sortOrder: 10
	},
	{
		id: 'fisica',
		label: 'Fisica',
		description: 'Come si comporta il mondo, dal quanto al cosmo.',
		icon: 'atom',
		color: '#6D28D9',
		onColor: '#FFFFFF',
		sortOrder: 20
	},
	{
		id: 'chimica',
		label: 'Chimica',
		description: 'Materia, reazioni, legami.',
		icon: 'flask',
		color: '#047857',
		onColor: '#FFFFFF',
		sortOrder: 30
	},
	{
		id: 'biologia',
		label: 'Biologia',
		description: 'Vita, cellule, evoluzione.',
		icon: 'leaf',
		color: '#15803D',
		onColor: '#FFFFFF',
		sortOrder: 40
	},
	{
		id: 'medicina',
		label: 'Medicina',
		description: 'Corpo umano, salute, farmaci.',
		icon: 'heart-pulse',
		color: '#BE123C',
		onColor: '#FFFFFF',
		sortOrder: 50
	},
	{
		id: 'tech',
		label: 'Tech',
		description: 'Software, hardware, reti, intelligenza artificiale.',
		icon: 'cpu',
		color: '#0F766E',
		onColor: '#FFFFFF',
		sortOrder: 60
	},
	{
		id: 'spazio',
		label: 'Spazio',
		description: 'Astronomia, missioni, oggetti celesti.',
		icon: 'rocket',
		color: '#1E293B',
		onColor: '#FFFFFF',
		sortOrder: 70
	},
	{
		id: 'storia',
		label: 'Storia',
		description: 'Fatti, epoche, personaggi.',
		icon: 'scroll',
		color: '#92400E',
		onColor: '#FFFFFF',
		sortOrder: 80
	},
	{
		id: 'arte',
		label: 'Arte',
		description: 'Pittura, musica, architettura, cinema.',
		icon: 'palette',
		color: '#A21CAF',
		onColor: '#FFFFFF',
		sortOrder: 90
	},
	{
		id: 'lingue',
		label: 'Lingue',
		description: 'Etimologie, grammatica, linguistica.',
		icon: 'languages',
		color: '#B45309',
		onColor: '#FFFFFF',
		sortOrder: 100
	},
	{
		id: 'economia',
		label: 'Economia',
		description: 'Mercati, denaro, decisioni.',
		icon: 'trending-up',
		color: '#0369A1',
		onColor: '#FFFFFF',
		sortOrder: 110
	},
	{
		id: 'psicologia',
		label: 'Psicologia',
		description: 'Mente, comportamento, bias cognitivi.',
		icon: 'brain',
		color: '#7C2D12',
		onColor: '#FFFFFF',
		sortOrder: 120
	},
	{
		id: 'filosofia',
		label: 'Filosofia',
		description: 'Idee, etica, logica, grandi domande.',
		icon: 'lightbulb',
		color: '#4338CA',
		onColor: '#FFFFFF',
		sortOrder: 130
	},
	{
		id: 'curiosita',
		label: 'Curiosità',
		description: 'Cose che non sapevi di voler sapere.',
		icon: 'sparkles',
		color: '#C2410C',
		onColor: '#FFFFFF',
		sortOrder: 140
	},
	{
		id: 'cultura-generale',
		label: 'Cultura generale',
		description: 'Tutto il resto, ma che vale la pena sapere.',
		icon: 'book-open',
		color: '#475569',
		onColor: '#FFFFFF',
		sortOrder: 150
	}
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): CategorySeed | undefined {
	return BY_ID.get(id);
}
