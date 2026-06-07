import eslintConfig from "@electron-toolkit/eslint-config";

export default [
	{
		ignores: ["node_modules/", "dist/"],
	},
	eslintConfig,
	{
		rules: {
			"no-empty": ["error", { allowEmptyCatch: true }],
		},
	},
];
