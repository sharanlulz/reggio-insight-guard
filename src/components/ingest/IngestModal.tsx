// Enhanced IngestModal with URL support
// REPLACE ENTIRE CONTENTS of: src/components/ingest/IngestModal.tsx

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Link2, Upload, Globe, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IngestModalProps {
  open: boolean;
  onClose: () => void;
}

type IngestMode = "url" | "file" | "text";

interface RegulationOption {
  id: string;
  title: string;
  short_code: string;
}

// Common regulatory document URLs for quick access
const QUICK_URLs = [
  {
    category: "UK - PRA",
    urls: [
      {
        name: "PRA Rulebook - Liquidity",
        url: "https://www.bankofengland.co.uk/prudential-regulation/publication/2015/pra-rulebook-crd-firms-liquidity",
        suggested_id: "PRA-LIQ",
      },
      {
        name: "PRA110 Instructions",
        url: "https://www.bankofengland.co.uk/prudential-regulation/regulatory-reporting/regulatory-reporting-banking-sector/pra110",
        suggested_id: "PRA-PRA110",
      }
    ]
  },
  {
    category: "UK - FCA",
    urls: [
      {
        name: "FCA Handbook - SYSC",
        url: "https://www.handbook.fca.org.uk/handbook/SYSC.pdf",
        suggested_id: "FCA-SYSC",
      }
    ]
  },
  {
    category: "EU - EBA",
    urls: [
      {
        name: "CRR - Capital Requirements Regulation",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32013R0575",
        suggested_id: "EU-CRR",
      }
    ]
  }
];

export default function IngestModal({ open, onClose }: IngestModalProps) {
  const [mode, setMode] = useState<IngestMode>("url");
  const [loading, setLoading] = useState(false);
  
  // Common fields
  const [regulationId, setRegulationId] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [regulations, setRegulations] = useState<RegulationOption[]>([]);
  const [createNewReg, setCreateNewReg] = useState(false);
  
  // New regulation fields
  const [newRegTitle, setNewRegTitle] = useState("");
  const [newRegShortCode, setNewRegShortCode] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [regulator, setRegulator] = useState("");
  
  // URL mode fields
  const [sourceUrl, setSourceUrl] = useState("");
  const [urlPreview, setUrlPreview] = useState<{title?: string; description?: string; error?: string} | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // File mode fields
  const [file, setFile] = useState<File | null>(null);
  
  // Text mode fields
  const [manualText, setManualText] = useState("");
  const [textChunks, setTextChunks] = useState<Array<{path: string; text: string}>>([]);

  // Document metadata
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [language, setLanguage] = useState("en");
  const [publishedAt, setPublishedAt] = useState("");

  // Load existing regulations
  useEffect(() => {
    if (open) {
      loadRegulations();
      // Reset form
      setRegulationId("");
      setVersionLabel("");
      setSourceUrl("");
      setFile(null);
      setManualText("");
      setUrlPreview(null);
      setCreateNewReg(false);
    }
  }, [open]);

  async function loadRegulations() {
    try {
      const { data, error } = await supabase
        .from("regulations")
        .select("id, title, short_code")
        .order("title");
      
      if (error) throw error;
      setRegulations(data || []);
    } catch (error: any) {
      console.error("Failed to load regulations:", error);
      toast({
        variant: "destructive",
        title: "Load failed",
        description: error.message
      });
    }
  }

  async function previewUrl(url: string) {
    if (!url.trim()) {
      setUrlPreview(null);
      return;
    }

    setPreviewLoading(true);
    try {
      // Simple URL validation
      new URL(url);
      
      // Try to fetch head information (this is limited by CORS in browser)
      setUrlPreview({
        title: extractTitleFromUrl(url),
        description: `Ready to ingest from: ${new URL(url).hostname}`
      });
    } catch (error) {
      setUrlPreview({
        error: "Invalid URL format"
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  function extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;
      
      // Extract meaningful parts
      const parts = path.split('/').filter(p => p.length > 0);
      const lastPart = parts[parts.length - 1];
      
      if (lastPart && lastPart.includes('.')) {
        return `${hostname} - ${lastPart}`;
      }
      
      return hostname;
    } catch {
      return "Document";
    }
  }

  function useQuickUrl(quickUrl: typeof QUICK_URLs[0]["urls"][0]) {
    setSourceUrl(quickUrl.url);
    if (quickUrl.suggested_id && !newRegShortCode) {
      setNewRegShortCode(quickUrl.suggested_id);
      setNewRegTitle(quickUrl.name);
      setCreateNewReg(true);
    }
    previewUrl(quickUrl.url);
  }

  function chunkManualText(text: string) {
    const maxChunkSize = 2000;
    const chunks: Array<{path: string; text: string}> = [];
    
    // Try to split on double newlines (paragraphs) first
    let sections = text.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    
    let sectionIndex = 1;
    for (const section of sections) {
      if (section.length <= maxChunkSize) {
        chunks.push({
          path: `Section ${sectionIndex}`,
          text: section.trim()
        });
        sectionIndex++;
      } else {
        // Split large sections
        let start = 0;
        let subsectionIndex = 1;
        while (start < section.length) {
          let end = Math.min(start + maxChunkSize, section.length);
          
          // Try to break on sentence
          if (end < section.length) {
            const lastPeriod = section.lastIndexOf('.', end);
            if (lastPeriod > start + maxChunkSize * 0.7) {
              end = lastPeriod + 1;
            }
          }
          
          chunks.push({
            path: `Section ${sectionIndex}.${subsectionIndex}`,
            text: section.slice(start, end).trim()
          });
          
          start = end;
          subsectionIndex++;
        }
        sectionIndex++;
      }
    }
    
    setTextChunks(chunks);
  }

  async function createRegulationIfNeeded(): Promise<string> {
    if (!createNewReg) {
      return regulationId;
    }

    if (!newRegTitle || !newRegShortCode) {
      throw new Error("New regulation title and short code are required");
    }

    // Get current user's org
    const { data: profile } = await supabase.auth.getUser();
    if (!profile.user) throw new Error("Not authenticated");

    // For demo, use the default org - in production you'd get this from user profile
    const orgId = "d3546758-a241-4546-aff7-fa600731502a";

    const { data: newReg, error } = await supabase
      .from("regulations")
      .insert({
        org_id: orgId,
        title: newRegTitle,
        short_code: newRegShortCode,
        jurisdiction: jurisdiction || null,
        regulator: regulator || null
      })
      .select("id")
      .single();

    if (error) throw error;
    return newReg.id;
  }

  async function handleIngest() {
    if (!versionLabel.trim()) {
      toast({ variant: "destructive", title: "Missing info", description: "Version label is required" });
      return;
    }

    try {
      setLoading(true);

      const finalRegulationId = await createRegulationIfNeeded();
      
      let payload: any = {
        regulationId: finalRegulationId,
        document: {
          versionLabel: versionLabel.trim(),
          docType,
          language,
          published_at: publishedAt || null
        }
      };

      if (mode === "url") {
        if (!sourceUrl.trim()) {
          throw new Error("Source URL is required");
        }
        payload.source_url = sourceUrl.trim();
        payload.document.source_url = sourceUrl.trim();
        
      } else if (mode === "file") {
        if (!file) {
          throw new Error("File is required");
        }
        // For file mode, you'd typically upload to Supabase storage first
        // For now, we'll show an error since the edge function expects URL or chunks
        throw new Error("File upload not implemented yet - please use URL mode");
        
      } else if (mode === "text") {
        if (!manualText.trim()) {
          throw new Error("Text content is required");
        }
        
        if (textChunks.length === 0) {
          chunkManualText(manualText);
        }
        
        payload.chunks = textChunks.map(chunk => ({
          path_hierarchy: chunk.path,
          text_raw: chunk.text,
          number_label: null
        }));
      }

      // Call the enhanced edge function
      const { error: fnError } = await supabase.functions.invoke("reggio-ingest", {
        body: payload
      });

      if (fnError) throw fnError;

      toast({ 
        title: "Ingestion started", 
        description: `Processing ${mode === "url" ? "URL" : mode === "file" ? "file" : `${textChunks.length} text chunks`}...` 
      });
      
      onClose();
      
    } catch (err: any) {
      console.error("Ingestion error:", err);
      toast({
        variant: "destructive",
        title: "Ingestion failed",
        description: err.message || "Unknown error occurred"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ingest Regulatory Document
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Source */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Document Source</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as IngestMode)} className="mt-2">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="url" className="flex items-center gap-1">
                    <Link2 className="h-4 w-4" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-1">
                    <Upload className="h-4 w-4" />
                    File
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <Label htmlFor="sourceUrl">Document URL</Label>
                    <Input
                      id="sourceUrl"
                      placeholder="https://example.com/regulation.pdf"
                      value={sourceUrl}
                      onChange={(e) => {
                        setSourceUrl(e.target.value);
                        previewUrl(e.target.value);
                      }}
                    />
                    {previewLoading && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Validating URL...
                      </div>
                    )}
                    {urlPreview?.error && (
                      <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {urlPreview.error}
                      </div>
                    )}
                    {urlPreview?.title && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ {urlPreview.description}
                      </div>
                    )}
                  </div>

                  {/* Quick URLs */}
                  <div>
                    <Label className="text-sm">Quick Access</Label>
                    <div className="mt-2 space-y-3 max-h-48 overflow-auto">
                      {QUICK_URLs.map((category) => (
                        <div key={category.category}>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {category.category}
                          </div>
                          <div className="space-y-1">
                            {category.urls.map((quickUrl, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="h-auto p-2 justify-start text-left w-full"
                                onClick={() => useQuickUrl(quickUrl)}
                              >
                                <div className="text-xs">
                                  <div className="font-medium">{quickUrl.name}</div>
                                  <div className="text-muted-foreground truncate">
                                    {quickUrl.url}
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <div>
                    <Label htmlFor="file">Upload Document</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.docx,.txt,.html"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Supports: PDF, DOCX, TXT, HTML
                    </div>
                  </div>
                  {file && (
                    <Card className="p-3">
                      <div className="text-sm">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="manualText">Paste Text Content</Label>
                    <Textarea
                      id="manualText"
                      placeholder="Paste regulatory text here..."
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      rows={8}
                    />
                  </div>
                  {manualText.trim() && (
                    <Button
                      variant="outline"
                      onClick={() => chunkManualText(manualText)}
                      size="sm"
                    >
                      Preview Chunks ({Math.ceil(manualText.length / 2000)} estimated)
                    </Button>
                  )}
                  {textChunks.length > 0 && (
                    <div className="text-xs text-green-600">
                      ✓ Text chunked into {textChunks.length} sections
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Column: Metadata */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Regulation & Metadata</Label>
            </div>

            {/* Regulation Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Target Regulation</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateNewReg(!createNewReg)}
                >
                  {createNewReg ? "Select Existing" : "Create New"}
                </Button>
              </div>

              {createNewReg ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Regulation title"
                    value={newRegTitle}
                    onChange={(e) => setNewRegTitle(e.target.value)}
                  />
                  <Input
                    placeholder="Short code (e.g., PRA-LIQ)"
                    value={newRegShortCode}
                    onChange={(e) => setNewRegShortCode(e.target.value.toUpperCase())}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Jurisdiction (e.g., UK)"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                    />
                    <Input
                      placeholder="Regulator (e.g., PRA)"
                      value={regulator}
                      onChange={(e) => setRegulator(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <Select value={regulationId} onValueChange={setRegulationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose regulation..." />
                  </SelectTrigger>
                  <SelectContent>
                    {regulations.map((reg) => (
                      <SelectItem key={reg.id} value={reg.id}>
                        {reg.title} ({reg.short_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Version and Document Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="versionLabel">Version Label</Label>
                <Input
                  id="versionLabel"
                  placeholder="e.g., v1.0, 2024-Q1"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="docType">Document Type</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as "Regulation" | "Guidance")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regulation">Regulation</SelectItem>
                    <SelectItem value="Guidance">Guidance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="publishedAt">Published Date</Label>
                <Input
                  id="publishedAt"
                  type="date"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleIngest} disabled={loading}>
            {loading ? "Starting..." : "Start Ingestion"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
