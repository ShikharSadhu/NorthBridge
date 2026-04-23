describe('voice service cost-aware extraction strategy', () => {
	beforeEach(() => {
		jest.resetModules();
		delete process.env.VOICE_AI_MODE;
		delete process.env.GEMINI_API_KEY;
	});

	test('local-only mode does not call Gemini and returns local extraction', async () => {
		const generateContent = jest.fn();
		jest.doMock('@google/generative-ai', () => ({
			GoogleGenerativeAI: jest.fn(() => ({
				getGenerativeModel: () => ({generateContent}),
			})),
		}));

		process.env.VOICE_AI_MODE = 'local-only';
		process.env.GEMINI_API_KEY = 'dummy-key';
		const {extractTaskFields} = require('../../src/services/voice.service');

		const result = await extractTaskFields('Need help in Delhi for 250 today');

		expect(generateContent).not.toHaveBeenCalled();
		expect(result).toHaveProperty('location', 'Delhi for 250 today');
		expect(result).toHaveProperty('price', 250);
		expect(result).toHaveProperty('executionMode', 'offline');
	});

	test('local-first mode skips Gemini when local extraction is good enough', async () => {
		const generateContent = jest.fn();
		jest.doMock('@google/generative-ai', () => ({
			GoogleGenerativeAI: jest.fn(() => ({
				getGenerativeModel: () => ({generateContent}),
			})),
		}));

		process.env.VOICE_AI_MODE = 'local-first';
		process.env.GEMINI_API_KEY = 'dummy-key';
		const {extractTaskFields} = require('../../src/services/voice.service');

		const result = await extractTaskFields(
			'Please deliver a package in Noida sector 62 for 300 before evening',
		);

		expect(generateContent).not.toHaveBeenCalled();
		expect(result.price).toBe(300);
		expect(result.location).toContain('Noida');
	});

	test('gemini-first mode calls Gemini when available', async () => {
		const generateContent = jest.fn(async () => ({
			response: {
				text: () =>
					'{"title":"Buy groceries","description":"Buy milk","location":"Gurgaon","price":150,"scheduledAt":null,"executionMode":"offline"}',
			},
		}));
		jest.doMock('@google/generative-ai', () => ({
			GoogleGenerativeAI: jest.fn(() => ({
				getGenerativeModel: () => ({generateContent}),
			})),
		}));

		process.env.VOICE_AI_MODE = 'gemini-first';
		process.env.GEMINI_API_KEY = 'dummy-key';
		const {extractTaskFields} = require('../../src/services/voice.service');

		const result = await extractTaskFields('buy milk in gurgaon for 150');

		expect(generateContent).toHaveBeenCalledTimes(1);
		expect(result).toHaveProperty('title', 'Buy groceries');
		expect(result).toHaveProperty('location', 'Gurgaon');
		expect(result).toHaveProperty('price', 150);
	});
});
