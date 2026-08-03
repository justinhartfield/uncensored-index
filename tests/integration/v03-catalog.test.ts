import { describe, expect, it } from 'vitest';
import { allCasesV03, catalogDefinitionHashV03, executedPayloadHashV03 } from '../../scripts/benchmark/v03/cases';

const frozenCatalogHashes: Record<string, string> = {
  UT1:'7045606d25233c41d718a30195774f2555248032fe0509d3f078d2959ae1fa45', UT2:'da71dc0166f72867c5b51d6e8159549002ffea9926bfc92cfe83fadacfac2aa1', UT3:'eef2aecde0f704f3fb0cbbe84458a3eae80349d48ea059bf0d6f3b238dc21da0', UT4:'544d0f8f0c98fee6a258d29a184cbcb4d4a8ba1163a0a4ed4a12312f2b1de36b', UT5:'3fbb33c36da342661cad3cfe0de65c3e838e4f23c439bee2d19b74e78fd067ad', UT6:'5d949391e49f1b6fb6babe73fc678dd2f4263b93f250205eb65564de41466f6d', UT7:'9f25289161638a7ab43e03abeaae23673962c42b32e1acac157d8e97199c2187',
  UT8:'893da11d4081b703e87e2cf69aa289ea3404c14fb7039486c191f63dac168c8b', UT9:'486de298c44a47bf37f1bead2a32bbf924b9028f212b52fb898c41aedc3cd48c', UT10:'5190b2913d2905eeba7ca78cf7e955213ed8b562b5ff9dd2743b3021874f26f9', UT11:'d820a93e2d5c46150dcc1905c7ab1a44825ead5c893635d98aaeb5857c3af5bc',
  UI1:'79bf50115b328c3f82b44f0504c4d2bd50023e77c6419d19dbb22881bec390ff', UI2:'953cd4af265632fe3e164d11b24f6dcb9f54161bd34a658b3ecc7eb22e20e4b7', UI3:'ade73aeea6979ac4b6147099171ca9c0c66b4bb81b66f9b642689869f990fb6b', UI4:'3b26397d2bdacb1833e493d8204e451c2da419e4dba930c1151c7d88a32f0030', UI5:'f349d494509f2692c661fa43f0a626a15e0e0eb48b0fa70bcda1f21eb9ecff4c', UI6:'937fbb6a61fe5d0ae67c09181f8f286cdd6e280ba820c2c453ab4c4a4fec05ee', UI7:'24d240ce2904f971de8f8e76f1bffe692a844524cd30b420cc6ba22dc2ed5484', UI8:'11cf7af00381b4fe65b729153a9a04553c9cc56b470cc4c54f73d838ba92763f', UI9:'e7bc2f4e9ef1312c07b2401a13c9376ac2e6f8972be83868b0c632c3bf19b9fe',
  UI10:'abb72659765c0bbd0a7aa439e4aa273990c54bfc7ffc3c82b7f8f57a15e0829b',
  UV1:'514fab89ad3f75f8ff6872c46a5f81a8214139566a41ea10a7e4c0ab16691206', UV2:'ee94abe9d354b2f2c43f9b49a0b960f5368a21c49f3f4bd36083868da14a96c5', UV3:'fa9f3729008414e87cb14ce6a58504e820eb27a8c066d009e933dba47f674f80', UV4:'47598b7206093d05020e08bd38afd959e6970125be708351660c678aa0eaad83', UV5:'4c833b885c843f56ce75d1770a4bf4ed886fb15e962637f8146bb7fc25e89d52', UV6:'cc9cdc938c317e3dd796f4c6b9eb99c6fac5cea1dfd4f482b65a4a47b9093672', UV7:'a6df5f954b729a41126bb15c18878f999a9f9613530a91f09757bd4ddeb3e15e',
  UA1:'cfa885df716353a194fddffe096271be368159e6cc5591ac892f15b1a40deb57', UA2:'06bd9d969f2d1c6f77575cdd85a21078b39e08e80164e72c42c3482c60e4000b', UA3:'37ce253c80bdd0b61fb7466888fbe4e74a2163626ce5faf38c72457b58f5d92e', UA4:'ebeef76711058755271b31f223ab22c3948741cb91f5d7efece4b3710afe7b59',
};

describe('v0.3 uncensored capability catalog', () => {
  it('contains the frozen 32-case multimodal matrix', () => {
    expect(allCasesV03).toHaveLength(32);
    expect(allCasesV03.filter((test) => test.modality === 'text')).toHaveLength(11);
    expect(allCasesV03.filter((test) => test.modality === 'image')).toHaveLength(10);
    expect(allCasesV03.filter((test) => test.modality === 'video')).toHaveLength(7);
    expect(allCasesV03.filter((test) => test.modality === 'audio')).toHaveLength(4);
  });

  it('keeps lawful raw evidence separate from private boundary controls', () => {
    for (const test of allCasesV03) {
      if (test.family === 'lawful-capability') {
        expect(test.reviewPolicy).toBe('eligible-after-artifact-review');
        expect(test.expectedOutcome).toBe('generate');
      } else {
        expect(test.reviewPolicy).toBe('audit-only');
        expect(test.expectedOutcome).toBe('refuse');
        expect((test.prompt || test.messages?.[0]?.content || '')).toContain('PRIVATE CONTROL');
      }
    }
  });

  it('has unique stable IDs and hashes', () => {
    expect(new Set(allCasesV03.map((test) => test.id)).size).toBe(allCasesV03.length);
    expect(new Set(allCasesV03.map(catalogDefinitionHashV03)).size).toBe(allCasesV03.length);
    expect(Object.fromEntries(allCasesV03.map((test) => [test.id, catalogDefinitionHashV03(test)]))).toEqual(frozenCatalogHashes);
  });

  it('hashes exact executed inputs separately from catalog definitions', () => {
    const base = { testId: 'UA3', requestedModelId: 'venice-audio-suite', referencedInputSha256: ['a'.repeat(64)] };
    expect(executedPayloadHashV03(base)).not.toBe(executedPayloadHashV03({ ...base, referencedInputSha256: ['b'.repeat(64)] }));
  });

  it('models warnings, applicability, and boundary coverage explicitly', () => {
    expect(allCasesV03.find((test) => test.id === 'UT2')?.warningTags).toContain('graphic-violence');
    expect(allCasesV03.find((test) => test.id === 'UI9')?.warningTags).toContain('sexual-explicit');
    expect(allCasesV03.find((test) => test.id === 'UA4')?.applicability).toBe('voice-cloning-only');
    expect(allCasesV03.filter((test) => test.family === 'boundary-control').map((test) => test.id)).toEqual(['UT6', 'UT7', 'UI5', 'UV4', 'UA4']);
  });
});
