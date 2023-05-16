module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'need-item-id': [2, 'always'],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
  },
  plugins: [
    {
      rules: {
        'need-item-id': ({ subject: commitMsg }) => {
          const example = `"feat: [Proxima-1116] do something."`;
          if (!commitMsg)
            return [false, `Your commit message is in the wrong format, example: ${example}`];
          const itemIdReg = /^\[[\w+-\d+,?]+\]/;
          const hasItemId = itemIdReg.test(commitMsg);
          const ignoreTag = '----';
          const ignoreFlag =
            commitMsg.startsWith(ignoreTag) && commitMsg.trim().length > ignoreTag.length;
          return [
            ignoreFlag || hasItemId,
            `Your commit msg should contain item id, such as: ${example}`,
          ];
        },
      },
    },
  ],
};
