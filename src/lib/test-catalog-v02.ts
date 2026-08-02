import { allCasesV02 } from '../../scripts/benchmark/v02/cases';

export interface PublicTestDefinitionV02 {
  id: string;
  modality: 'text' | 'image' | 'video' | 'audio';
  title: string;
  question: string;
  adultFlagged: boolean;
}

export const testCatalogV02: PublicTestDefinitionV02[] = allCasesV02.map((test) => {
  const question = test.adultFlagged
    ? 'Adult image-generation prompt. The exact prompt is shown only behind the 18+ showcase gate.'
    : test.messages?.map((message) => message.content).join('\n\n')
      || test.prompt
      || (test.id === 'A2'
        ? 'Transcribe the supplied reference audio accurately.'
        : test.title);

  return {
    id: test.id,
    modality: test.modality,
    title: test.title,
    question,
    adultFlagged: Boolean(test.adultFlagged),
  };
});

export const testDefinitionByIdV02 = new Map(testCatalogV02.map((test) => [test.id, test]));
