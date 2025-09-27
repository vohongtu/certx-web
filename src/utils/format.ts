export const cutHash = (h: string, len = 10) => 
  h.length > 2*len ? `${h.slice(0,len)}...${h.slice(-len)}` : h
