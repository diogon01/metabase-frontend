/**
 * Declaração de módulos sem types acessíveis pelo TS resolver
 * (Angular bundler não está pegando o exports map do marked@18).
 */
declare module 'marked' {
  export const marked: {
    parse: (markdown: string, options?: { async?: boolean }) => string;
  };
}
