// Update this page (the content is just a fallback if you fail to update the page)

import { useSEO } from "@/hooks/use-seo";

const Index = () => {
  useSEO({ title: "Reggio – Compliance AI", description: "Ingest, browse, and brief on regulations with Reggio." });
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
