// Enhanced IngestModal with auto-detection capabilities
// REPLACE ENTIRE CONTENTS of: src/components/ingest/IngestModal.tsx

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IngestModalProps {
  open: boolean;
  onClose: () => void;
}

interface Regulation {
  id: string;
  title: string;
  short_code: string;
}

interface DetectedMetadata {
  title?: string;
  regulator?: string;
  jurisdiction?: string;
  document_type?: string;
  published_date?: string;
  version?: string;
  confidence_score?: number;
}

const QUICK_URLS = [
  {
    name: "UK PRA - Liquidity Rules",
    url: "https://www.bankofengland.co.uk/prudential-regulation/publication/2015/liquidity-coverage-ratio-rules",
    suggested_id: "PRA-LCR",
    suggested_title: "PRA Liquidity Coverage Ratio Rules"
  },
  {
    name: "UK PRA - PRA110 Instructions",
    url: "https://www.bankofengland.co.uk/prudential-regulation/publication/2023/pra110-regulatory-return",
    suggested_id: "PRA-PRA110",
    suggested_title: "PRA110 Regulatory Return Instructions"
  },
  {
    name: "UK FCA - Handbook MIFIDPRU",
    url: "https://www.handbook.fca.org.uk/handbook/MIFIDPRU/",
    suggested_id: "FCA-MIFIDPRU",
    suggested_title: "FCA MIFIDPRU Sourcebook"
  },
  {
    name: "EU EBA - Capital Requirements Regulation",
    url: "https://eba.europa.eu/regulation-and-policy/single-rulebook/interactive-single-rulebook/100",
    suggested_id: "EBA-CRR",
    suggested_title: "Capital Requirements Regulation"
  }
];

export default function IngestModal({ open, onClose }: IngestModalProps) {
  // Form state
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  
  // Regulation state
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [selectedRegulation, setSelectedRegulation] = useState("");
  const [createNewReg, setCreateNewReg] = useState(false);
  const [newRegTitle, setNewRegTitle] = useState("");
  const [newRegShortCode, setNewRegShortCode] = useState("");
  const [newRegJurisdiction, setNewRegJurisdiction] = useState("UK");
  const [newRegRegulator, setNewRegRegulator] = useState("PRA");
  
  // Document metadata
  const [versionLabel, setVersionLabel] = useState("");
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [language, setLanguage] = useState("en");
  const [publishedDate, setPublishedDate] = useState("");
  
  // Auto-detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedMetadata, setDetectedMetadata] = useState<DetectedMetadata | null>(null);
  const [detectionError, setDetectionError] = useState("");
  
  // Processing state
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState("");

  // Load regulations on mount
  useEffect(() => {
    if (open) {
      loadRegulations();
    }
  }, [open]);

  // Auto-detect metadata when URL changes
  useEffect(() => {
    if (url && activeTab === "url") {
      detectMetadata(url);
    }
  }, [url]);

  const loadRegulations = async () => {
    try {
      const { data, error } = await supabase
        .from("regulations")
        .select("id, title, short_code")
        .order("title");

      if (error) throw error;
      setRegulations(data || []);
    } catch (err: any) {
      console.error("Failed to load regulations:", err);
    }
  };

  const detectMetadata = async (targetUrl: string) => {
    if (!targetUrl.startsWith("http")) return;
    
    setIsDetecting(true);
    setDetectionError("");
    
    try {
      // Simple client-side detection for known patterns
      const basicMetadata = detectBasicMetadata(targetUrl);
      
      if (basicMetadata) {
        setDetectedMetadata(basicMetadata);
        
        // Auto-populate form fields
        if (basicMetadata.title && !newRegTitle) {
          setNewRegTitle(basicMetadata.title);
        }
        if (basicMetadata.version && !versionLabel) {
          setVersionLabel(basicMetadata.version);
        }
        if (basicMetadata.published_date && !publishedDate) {
          setPublishedDate(basicMetadata.published_date);
        }
        if (basicMetadata.document_type) {
          setDocType(basicMetadata.document_type === "guidance" ? "Guidance" : "Regulation");
        }
        if (basicMetadata.regulator && !newRegRegulator) {
          setNewRegRegulator(basicMetadata.regulator);
        }
        if (basicMetadata.jurisdiction && !newRegJurisdiction) {
          setNewRegJurisdiction(basicMetadata.jurisdiction);
        }
      }
      
      // Try to call the edge function for enhanced detection (optional)
      try {
        const { data, error } = await supabase.functions.invoke('reggio-detect-metadata', {
          body: { url: targetUrl }
        });

        if (!error && data?.metadata) {
          // Merge with enhanced results
          const enhancedMetadata = { ...basicMetadata, ...data.metadata };
          setDetectedMetadata(enhancedMetadata);
          
          // Update form fields with enhanced data
          if (data.metadata.title && data.metadata.title !== basicMetadata?.title) {
            setNewRegTitle(data.metadata.title);
          }
        }
      } catch (enhancedError) {
        console.log("Enhanced detection not available, using basic detection only");
        // Don't show this as an error since we have basic detection
      }
      
    } catch (err: any) {
      console.error("Metadata detection failed:", err);
      setDetectionError(`Detection failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Basic client-side metadata detection
  const detectBasicMetadata = (url: string): DetectedMetadata | null => {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('bankofengland.co.uk') && lowerUrl.includes('prudential')) {
      return {
        regulator: "PRA",
        jurisdiction: "UK",
        document_type: "regulation",
        confidence_score: 0.8
      };
    }
    
    if (lowerUrl.includes('handbook.fca.org.uk')) {
      return {
        regulator: "FCA",
        jurisdiction: "UK", 
        document_type: "regulation",
        confidence_score: 0.8
      };
    }
    
    if (lowerUrl.includes('eba.europa.eu')) {
      return {
        regulator: "EBA",
        jurisdiction: "EU",
        document_type: "regulation", 
        confidence_score: 0.8
      };
    }
    
    if (lowerUrl.includes('federalregister.gov')) {
      return {
        regulator: "Federal Register",
        jurisdiction: "US",
        document_type: "regulation",
        confidence_score: 0.7
      };
    }
    
    // Generic detection
    return {
      document_type: lowerUrl.includes('guidance') ? "guidance" : "regulation",
      confidence_score: 0.3
    };
  };

  const handleQuickUrl = (quickUrl: typeof QUICK_URLS[0]) => {
    setUrl(quickUrl.url);
    setNewRegTitle(quickUrl.suggested_title);
    setNewRegShortCode(quickUrl.suggested_id);
    setCreateNewReg(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Auto-suggest version from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      if (!versionLabel) {
        setVersionLabel(nameWithoutExt);
      }
    }
  };

  const chunkText = (text: string): Array<{ path_hierarchy: string; text_raw: string; number_label?: string }> => {
    const maxChunkSize = 2000;
    const chunks = [];
    let chunkIndex = 1;
    
    // Try to split on paragraphs first, then sentences
    const paragraphs = text.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;
      
      if (paragraph.length <= maxChunkSize) {
        chunks.push({
          path_hierarchy: `Section ${chunkIndex}`,
          text_raw: paragraph.trim(),
          number_label: String(chunkIndex)
        });
        chunkIndex++;
      } else {
        // Split large paragraphs into sentences
        const sentences = paragraph.match(/[^\.!?]+[\.!?]+/g) || [paragraph];
        let currentChunk = "";
        
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
            chunks.push({
              path_hierarchy: `Section ${chunkIndex}`,
              text_raw: currentChunk.trim(),
              number_label: String(chunkIndex)
            });
            chunkIndex++;
            currentChunk = sentence;
          } else {
            currentChunk += sentence;
          }
        }
        
        if (currentChunk.trim()) {
          chunks.push({
            path_hierarchy: `Section ${chunkIndex}`,
            text_raw: currentChunk.trim(),
            number_label: String(chunkIndex)
          });
          chunkIndex++;
        }
      }
    }
    
    return chunks;
  };

  const handleIngest = async () => {
    console.log('Starting ingestion process...');
    setIsIngesting(true);
    setError("");

    try {
      let regulationToUse = selectedRegulation;

      // Create new regulation if needed
      if (createNewReg || !selectedRegulation) {
        if (!newRegTitle || !newRegShortCode) {
          throw new Error("Please provide regulation title and short code");
        }

        console.log('Creating new regulation...');
        const { data: newReg, error: regError } = await supabase
          .from("regulations")
          .insert({
            title: newRegTitle,
            short_code: newRegShortCode,
            jurisdiction: newRegJurisdiction,
            regulator: newRegRegulator
          })
          .select("id")
          .single();

        if (regError) throw regError;
        regulationToUse = newReg.id;
        console.log('New regulation created:', newReg.id);
      }

      if (!regulationToUse) {
        throw new Error("Please select or create a regulation");
      }

      // Prepare payload
      let payload: any = {
        regulationId: regulationToUse,
        document: {
          versionLabel: versionLabel || "v1.0",
          docType,
          language,
          published_at: publishedDate || null
        }
      };

      // Handle different input types
      if (activeTab === "url" && url) {
        payload.source_url = url;
        payload.document.source_url = url;
      } else if (activeTab === "file" && uploadedFile) {
        // For files, we need to convert to text first
        const fileText = await uploadedFile.text();
        payload.chunks = chunkText(fileText);
      } else if (activeTab === "text" && manualText) {
        payload.chunks = chunkText(manualText);
      } else {
        throw new Error("Please provide a URL, file, or text to ingest");
      }

      console.log('Calling ingestion function with payload:', payload);

      // Call ingestion function
      const response = await supabase.functions.invoke('reggio-ingest', {
        body: payload
      });

      console.log('Ingestion response:', response);

      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw new Error(response.error.message || 'Ingestion function failed');
      }

      if (!response.data?.ok) {
        const errorMsg = response.data?.error || 'Ingestion failed - unknown error';
        console.error('Function returned error:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Ingestion completed successfully');
      
      // Reset form and close
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Ingestion error details:', err);
      
      let errorMessage = 'Ingestion failed';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.error?.message) {
        errorMessage = err.error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsIngesting(false);
    }
  };

  const resetForm = () => {
    setActiveTab("url");
    setUrl("");
    setUploadedFile(null);
    setManualText("");
    setSelectedRegulation("");
    setCreateNewReg(false);
    setNewRegTitle("");
    setNewRegShortCode("");
    setNewRegJurisdiction("UK");
    setNewRegRegulator("PRA");
    setVersionLabel("");
    setDocType("Regulation");
    setLanguage("en");
    setPublishedDate("");
    setDetectedMetadata(null);
    setDetectionError("");
    setError("");
  };

  const handleClose = () => {
    if (!isIngesting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ingest Regulatory Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source Input Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Document Source</CardTitle>
              <CardDescription>Choose how to provide the document content</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="url">URL</TabsTrigger>
                  <TabsTrigger value="file">File Upload</TabsTrigger>
                  <TabsTrigger value="text">Manual Text</TabsTrigger>
                </TabsList>
                
                <TabsContent value="url" className="space-y-4">
                  <div>
                    <Label htmlFor="url">Document URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={isIngesting}
                    />
                  </div>
                  
                  {/* Quick Access Buttons */}
                  <div>
                    <Label>Quick Access</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {QUICK_URLS.map((quickUrl) => (
                        <Button
                          key={quickUrl.name}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickUrl(quickUrl)}
                          disabled={isIngesting}
                        >
                          {quickUrl.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Metadata Detection Results */}
                  {isDetecting && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Detecting document metadata...
                    </div>
                  )}

                  {detectedMetadata && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Auto-detected:</strong> {detectedMetadata.title} 
                        {detectedMetadata.confidence_score && 
                          ` (${Math.round(detectedMetadata.confidence_score * 100)}% confidence)`
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  {detectionError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{detectionError}</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                
                <TabsContent value="file" className="space-y-4">
                  <div>
                    <Label htmlFor="file">Upload Document</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.docx,.txt,.html"
                      onChange={handleFileUpload}
                      disabled={isIngesting}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Supported formats: PDF, DOCX, TXT, HTML
                    </p>
                  </div>
                  {uploadedFile && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Ready to process: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)}KB)
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                
                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="text">Regulatory Text</Label>
                    <Textarea
                      id="text"
                      placeholder="Paste regulatory text here..."
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      disabled={isIngesting}
                      rows={8}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Text will be automatically chunked for processing ({Math.ceil(manualText.length / 2000)} estimated chunks)
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Regulation Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Regulation</CardTitle>
              <CardDescription>Select existing regulation or create new one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="create-new"
                  checked={createNewReg}
                  onChange={(e) => setCreateNewReg(e.target.checked)}
                  disabled={isIngesting}
                />
                <Label htmlFor="create-new">Create new regulation</Label>
              </div>

              {!createNewReg && (
                <div>
                  <Label htmlFor="regulation">Select Regulation</Label>
                  <Select value={selectedRegulation} onValueChange={setSelectedRegulation} disabled={isIngesting}>
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
                </div>
              )}

              {createNewReg && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reg-title">Regulation Title</Label>
                    <Input
                      id="reg-title"
                      placeholder="e.g., PRA Liquidity Coverage Ratio Rules"
                      value={newRegTitle}
                      onChange={(e) => setNewRegTitle(e.target.value)}
                      disabled={isIngesting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-code">Short Code</Label>
                    <Input
                      id="reg-code"
                      placeholder="e.g., PRA-LCR"
                      value={newRegShortCode}
                      onChange={(e) => setNewRegShortCode(e.target.value)}
                      disabled={isIngesting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Select value={newRegJurisdiction} onValueChange={setNewRegJurisdiction} disabled={isIngesting}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="EU">European Union</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="regulator">Regulator</Label>
                    <Select value={newRegRegulator} onValueChange={setNewRegRegulator} disabled={isIngesting}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRA">PRA</SelectItem>
                        <SelectItem value="FCA">FCA</SelectItem>
                        <SelectItem value="EBA">EBA</SelectItem>
                        <SelectItem value="ECB">ECB</SelectItem>
                        <SelectItem value="FED">Federal Reserve</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Document Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="version">Version Label</Label>
                  <Input
                    id="version"
                    placeholder="e.g., v2.1, March 2024"
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    disabled={isIngesting}
                  />
                </div>
                <div>
                  <Label htmlFor="doc-type">Document Type</Label>
                  <Select value={docType} onValueChange={(value) => setDocType(value as "Regulation" | "Guidance")} disabled={isIngesting}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regulation">Regulation</SelectItem>
                      <SelectItem value="Guidance">Guidance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage} disabled={isIngesting}>
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
                  <Label htmlFor="published">Published Date</Label>
                  <Input
                    id="published"
                    type="date"
                    value={publishedDate}
                    onChange={(e) => setPublishedDate(e.target.value)}
                    disabled={isIngesting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isIngesting}>
              Cancel
            </Button>
            <Button onClick={handleIngest} disabled={isIngesting}>
              {isIngesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isIngesting ? "Processing..." : "Start Ingestion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
