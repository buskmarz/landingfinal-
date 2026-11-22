type Answer = {text: string; link: string; href: string};
type Topic = Answer & {topic: string; question: string; aliases?: string[]};
type Item = {id: string; category: string; name: string; size: string; price: number; description: string};
export function fromSite(input: string, topics: Topic[], items: Item[]): Answer | undefined;
