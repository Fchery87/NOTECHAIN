const browserOnly = (name: string) => () => {
  throw new Error(`${name} is browser-only in the Cloudflare build`);
};

export const env = {};
export const pipeline = browserOnly('pipeline');
export class Tensor {
  constructor() {
    browserOnly('Tensor')();
  }
}
export default {};
