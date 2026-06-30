declare module "mjml" {
  interface MjmlError {
    line: number;
    message: string;
    tagName: string;
    formattedMessage: string;
  }
  interface MjmlResult {
    html: string;
    errors: MjmlError[];
  }
  interface MjmlOptions {
    validationLevel?: "strict" | "soft" | "skip";
    minify?: boolean;
    keepComments?: boolean;
  }
  const mjml2html: (mjml: string, options?: MjmlOptions) => MjmlResult;
  export default mjml2html;
}
