import baseConfig from "../../eslint.base.config.mjs";
import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import js from '@eslint/js';
import { fixupConfigRules } from '@eslint/compat';
import nx from '@nx/eslint-plugin';

const compat = new FlatCompat({
    baseDirectory: dirname(fileURLToPath(import.meta.url)),
    recommendedConfig: js.configs.recommended,
});

export default [
    ...baseConfig,
    ...fixupConfigRules(compat.extends('next')),
    ...fixupConfigRules(compat.extends('next/core-web-vitals')),

    ...nx.configs['flat/react-typescript'],
    {
        ignores: ['.next/**/*'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'react-hooks/exhaustive-deps': 'off',
            '@next/next/no-img-element': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            'react/no-unescaped-entities': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'prefer-const': 'off',
            '@typescript-eslint/no-empty-object-type': 'off'
        }
    }
];
