import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["Backend/**"],
  },
];

export default eslintConfig;
