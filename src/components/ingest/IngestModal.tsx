// Enhanced IngestModal.tsx - REPLACE the existing src/components/ingest/IngestModal.tsx
// Improvements: Better chunking, error handling, progress tracking, user feedback

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Icons
import { Loader2, AlertCircle, Globe, Upload, FileText, Plus, Sparkles } from "lucide-react";

interface IngestModalProps {
  open: boolean;
  onClose: () => void;
}

// Quick URL suggestions for common regulatory documents
const QUICK_URLS = [
  {
    name: "PRA Rulebook",
    url: "https://www.prarulebook.co.uk/rulebook/Content/Part/211120/04-07-2022",
    suggested_title: "PRA Rulebook - Capital Requirements",
    suggested_id: "PRA_CRR"
  },
  {
    name: "FCA Handbook",
    url: "https://www.handbook.fca.org.uk/handbook/PRIN/",
    suggested_title: "FCA Principles for Businesses",
    suggested_id: "FCA_PRIN"
  },
  {
    name: "Basel III",
    url: "https://www.bis.org/bcbs/basel3.htm",
    suggested_title: "Basel III International Framework",
    suggested_id: "BASEL_III"
  }
];

export default function IngestModal({ open, onClose }: IngestModalProps) {
  // Form state
  const [activeTab, setActiveTab] = useState<"url" | "file" | "text">("url");
  const [url, setUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  
  // Regulation management
  const [regulations, setRegulations] = useState<any[]>([]);
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
  
  // Enhanced metadata detection
  const [detectedMetadata, setDetectedMetadata] = useState<any>(null);
  const [detectionError, setDetectionError] = useState("");
  
  // Processing state
  const [isIngesting, setIsIngesting] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [error, setError] = useState("");

  // Load existing regulations on mount
  useEffect(() => {
    if (open) {
      loadRegulations();
    }
  }, [open]);

  const loadRegulations = async () => {
    try {
      const { data, error } = await supabase
        .from("regulations")
        .select("id, title, short_code, jurisdiction")
        .order("title");
      
      if (error) throw error;
      setRegulations(data || []);
    } catch (error) {
      console.error("Failed to load regulations:", error);
      setRegulations([]);
    }
  };

  // Auto-detect metadata from URL
  const detectMetadataFromUrl = async (inputUrl: string) => {
    if (!inputUrl) return;
    
    try {
      setDetectionError("");
      const detectedData = extractMetadataFromUrl(inputUrl);
      setDetectedMetadata(detectedData);
      
      if (detectedData.suggested_title && !newRegTitle) {
        setNewRegTitle(detectedData.suggested_title);
      }
      if (detectedData.suggested_id && !newRegShortCode) {
        setNewRegShortCode(detectedData.suggested_id);
      }
    } catch (error) {
      setDetectionError("Could not detect metadata from URL");
    }
  };

  const extractMetadataFromUrl = (inputUrl: string) => {
    const url = inputUrl.toLowerCase();
    
    if (url.includes('prarulebook') || url.includes('bankofengland')) {
      return {
        suggested_title: "PRA Rulebook Section",
        suggested_id: "PRA_RB",
        jurisdiction: "UK",
        regulator: "PRA",
        doc_type: "regulation" as const,
        confidence_score: 0.9
      };
    }
    
    if (url.includes('handbook.fca') || url.includes('fca.org.uk')) {
      return {
        suggested_title: "FCA Handbook Section", 
        suggested_id: "FCA_HB",
        jurisdiction: "UK",
        regulator: "FCA",
        doc_type: "regulation" as const,
        confidence_score: 0.9
      };
    }
    
    if (url.includes('bis.org') || url.includes('basel')) {
      return {
        suggested_title: "Basel Committee Publication",
        suggested_id: "BASEL",
        jurisdiction: "GLOBAL",
        regulator: "BCBS", 
        doc_type: "guidance" as const,
        confidence_score: 0.8
      };
    }
    
    return {
      suggested_title: "Regulatory Document",
      suggested_id: "REG_DOC",
      jurisdiction: "UK",
      regulator: "Unknown",
      doc_type: url.includes('guidance') ? "guidance" as const : "regulation" as const,
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

  // Enhanced chunking with better error handling and progress feedback
  const chunkText = (text: string, onProgress?: (progress: number) => void): Array<{ path_hierarchy: string; text_raw: string; number_label?: string }> => {
    try {
      const maxChunkSize = 2000;
      const minChunkSize = 100;
      const chunks = [];
      let chunkIndex = 1;
      
      // Financial/regulatory keywords for better chunk detection
      const importantKeywords = ['shall', 'must', 'minimum', 'maximum', 'requirement', 'ratio', 'capital', 'liquidity'];
      
      // Clean and normalize text first
      const cleanText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
      if (cleanText.length < minChunkSize) {
        return [{
          path_hierarchy: 'Section 1',
          text_raw: cleanText,
          number_label: '1'
        }];
      }
      
      // Split by double newlines (paragraphs) or section markers
      const sections = cleanText.split(/\n\s*\n|\n(?=\d+\.|\([a-z]\)|\([0-9]\))/);
      const totalSections = sections.length;
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (section.length < 20) continue; // Skip very short sections
        
        // Update progress if callback provided
        if (onProgress) {
          onProgress((i / totalSections) * 100);
        }
        
        if (section.length <= maxChunkSize) {
          // Section fits in one chunk
          chunks.push({
            path_hierarchy: detectPathHierarchy(section, chunkIndex),
            text_raw: section,
            number_label: String(chunkIndex)
          });
          chunkIndex++;
        } else {
          // Split large sections more intelligently
          const subChunks = splitLargeSection(section, maxChunkSize, importantKeywords);
          for (const subChunk of subChunks) {
            if (subChunk.trim().length >= minChunkSize) {
              chunks.push({
                path_hierarchy: detectPathHierarchy(subChunk, chunkIndex),
                text_raw: subChunk.trim(),
                number_label: String(chunkIndex)
              });
              chunkIndex++;
            }
          }
        }
      }
      
      if (onProgress) onProgress(100);
      console.log(`Successfully created ${chunks.length} chunks from ${cleanText.length} characters`);
      return chunks;
      
    } catch (error) {
      console.error('Chunking failed:', error);
      // Fallback to simple splitting if advanced chunking fails
      return simpleFallbackChunking(text);
    }
  };

  // Helper function to detect section structure
  const detectPathHierarchy = (text: string, index: number): string => {
    // Try to extract section numbers from the beginning of text
    const sectionMatch = text.match(/^(\d+(?:\.\d+)*\.?)\s/);
    if (sectionMatch) {
      return `Section ${sectionMatch[1]}`;
    }
    
    const bulletMatch = text.match(/^[\-\*•]\s/);
    if (bulletMatch) {
      return `Item ${index}`;
    }
    
    const letterMatch = text.match(/^\([a-z]\)\s/);
    if (letterMatch) {
      return `Subsection ${letterMatch[1]}`;
    }
    
    // Check if it looks like a header (short, ends without period)
    if (text.length < 100 && !text.endsWith('.') && !text.includes('\n')) {
      return `Header ${index}`;
    }
    
    return `Section ${index}`;
  };

  // Smart splitting for large sections
  const splitLargeSection = (text: string, maxSize: number, keywords: string[]): string[] => {
    const chunks = [];
    let currentChunk = "";
    
    // Split by sentences but be smarter about it
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence.trim();
      
      if (potentialChunk.length > maxSize && currentChunk) {
        // Before splitting, check if we're breaking at an important point
        const hasImportantContent = keywords.some(keyword => 
          sentence.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasImportantContent && currentChunk.length > 500) {
          // Split here to keep important content together
          chunks.push(currentChunk.trim());
          currentChunk = sentence.trim();
        } else {
          // Continue building current chunk
          currentChunk = potentialChunk;
        }
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  };

  // Simple fallback if advanced chunking fails
  const simpleFallbackChunking = (text: string): Array<{ path_hierarchy: string; text_raw: string; number_label?: string }> => {
    const maxChunkSize = 2000;
    const chunks = [];
    let index = 0;
    
    while (index < text.length) {
      const chunk = text.slice(index, index + maxChunkSize);
      chunks.push({
        path_hierarchy: `Section ${chunks.length + 1}`,
        text_raw: chunk,
        number_label: String(chunks.length + 1)
      });
      index += maxChunkSize;
    }
    
    return chunks;
  };

  const handleIngest = async () => {
    console.log('Starting enhanced ingestion process...');
    setIsIngesting(true);
    setError("");

    try {
      // Step 1: Validation
      setProcessingStatus("Validating input...");
      let regulationToUse = selectedRegulation;
      const hasValidInput = (activeTab === "url" && url) || 
                           (activeTab === "file" && uploadedFile) || 
                           (activeTab === "text" && manualText?.trim());
      
      if (!hasValidInput) {
        throw new Error("Please provide a URL, upload a file, or enter text to ingest");
      }

      // Step 2: Create new regulation if needed (with better validation)
      if (createNewReg || !selectedRegulation) {
        if (!newRegTitle?.trim() || !newRegShortCode?.trim()) {
          throw new Error("Please provide both regulation title and short code");
        }

        // Validate short code format (alphanumeric, dashes, underscores only)
        if (!/^[A-Za-z0-9_-]+$/.test(newRegShortCode)) {
          throw new Error("Short code can only contain letters, numbers, dashes, and underscores");
        }

        console.log('Creating new regulation...');
        setProcessingStatus("Creating new regulation...");
        const { data: newReg, error: regError } = await supabase
          .from("regulations")
          .insert({
            title: newRegTitle.trim(),
            short_code: newRegShortCode.trim().toUpperCase(),
            jurisdiction: newRegJurisdiction,
            regulator: newRegRegulator
          })
          .select("id")
          .single();

        if (regError) {
          if (regError.code === '23505') { // Unique constraint violation
            throw new Error(`Regulation with short code "${newRegShortCode}" already exists`);
          }
          throw new Error(`Failed to create regulation: ${regError.message}`);
        }
        
        regulationToUse = newReg.id;
        console.log('New regulation created:', newReg.id);
      }

      if (!regulationToUse) {
        throw new Error("Please select or create a regulation");
      }

      // Step 3: Prepare payload with enhanced error handling
      setProcessingStatus("Preparing document...");
      let payload: any = {
        regulationId: regulationToUse,
        document: {
          versionLabel: versionLabel?.trim() || "v1.0",
          docType,
          language,
          published_at: publishedDate || null
        }
      };

      let chunkingProgress = 0;
      const updateChunkingProgress = (progress: number) => {
        chunkingProgress = progress;
        // Could add progress indicator here if needed
      };

      // Step 4: Handle different input types with better error handling
      if (activeTab === "url" && url) {
        // Validate URL format
        try {
          new URL(url);
        } catch {
          throw new Error("Please enter a valid URL (must start with http:// or https://)");
        }
        
        payload.source_url = url;
        payload.document.source_url = url;
        console.log('Ingesting from URL:', url);
        
      } else if (activeTab === "file" && uploadedFile) {
        console.log('Processing file:', uploadedFile.name, `(${uploadedFile.size} bytes)`);
        
        // Check file size (limit to 10MB)
        if (uploadedFile.size > 10 * 1024 * 1024) {
          throw new Error("File is too large. Please upload files smaller than 10MB.");
        }
        
        // Check file type
        const allowedTypes = ['text/plain', 'application/pdf', 'text/html', 'application/msword'];
        if (!allowedTypes.includes(uploadedFile.type) && !uploadedFile.name.match(/\.(txt|pdf|html|htm|doc|docx)$/i)) {
          console.warn(`Unknown file type: ${uploadedFile.type}, but proceeding anyway`);
        }
        
        try {
          setProcessingStatus("Reading file content...");
          const fileText = await uploadedFile.text();
          if (fileText.length < 100) {
            throw new Error("File appears to be empty or too short to process");
          }
          
          console.log(`File read successfully: ${fileText.length} characters`);
          setProcessingStatus("Creating text chunks...");
          payload.chunks = chunkText(fileText, updateChunkingProgress);
          console.log(`Created ${payload.chunks.length} chunks for processing`);
          
        } catch (fileError) {
          throw new Error(`Failed to read file: ${fileError.message}`);
        }
        
      } else if (activeTab === "text" && manualText) {
        const textContent = manualText.trim();
        if (textContent.length < 100) {
          throw new Error("Text is too short to process. Please provide at least 100 characters.");
        }
        
        console.log(`Processing manual text: ${textContent.length} characters`);
        setProcessingStatus("Creating text chunks...");
        payload.chunks = chunkText(textContent, updateChunkingProgress);
        console.log(`Created ${payload.chunks.length} chunks for processing`);
      }

      console.log('Calling ingestion function with payload:', {
        ...payload,
        chunks: payload.chunks ? `${payload.chunks.length} chunks` : 'URL processing'
      });

      // Step 5: Call ingestion function with timeout handling
      setProcessingStatus("Processing with AI analysis...");
      const TIMEOUT_MS = 30000; // 30 second timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Ingestion request timed out after 30 seconds')), TIMEOUT_MS);
      });

      const ingestionPromise = supabase.functions.invoke('reggio-ingest', {
        body: payload
      });

      const response = await Promise.race([ingestionPromise, timeoutPromise]) as any;

      console.log('Ingestion response:', response);

      // Step 6: Enhanced response handling
      if (response.error) {
        console.error('Supabase function error:', response.error);
        const errorMsg = response.error.message || response.error.details || 'Ingestion function failed';
        throw new Error(`Server error: ${errorMsg}`);
      }

      if (!response.data) {
        throw new Error('No response data received from server');
      }

      if (!response.data.ok) {
        const errorMsg = response.data.error || response.data.message || 'Ingestion failed - unknown error';
        console.error('Function returned error:', errorMsg);
        
        // Provide more helpful error messages based on common issues
        if (errorMsg.includes('timeout')) {
          throw new Error('Processing took too long. Please try with a smaller document or check your connection.');
        } else if (errorMsg.includes('API')) {
          throw new Error('AI analysis service is temporarily unavailable. Please try again in a few minutes.');
        } else if (errorMsg.includes('database')) {
          throw new Error('Database error occurred. Please try again or contact support if the problem persists.');
        }
        
        throw new Error(errorMsg);
      }

      console.log('Ingestion completed successfully');
      console.log('Document ID:', response.data.regulation_document_id);
      
      // Show success message
      setError(""); // Clear any previous errors
      
      // Reset form and close
      resetForm();
      onClose();
      
      // Could add a success toast here if toast system is available
      console.log('✅ Ingestion completed successfully!');
      
    } catch (err: any) {
      console.error('Ingestion error details:', err);
      
      let errorMessage = 'Ingestion failed';
      
      // Enhanced error message handling
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error: Please check your connection and try again';
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.error?.message) {
        errorMessage = err.error.message;
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      // Add helpful suggestions based on error type
      if (errorMessage.includes('timeout')) {
        errorMessage += ' Try processing a smaller document or check your internet connection.';
      } else if (errorMessage.includes('API')) {
        errorMessage += ' The AI service may be temporarily unavailable.';
      }
      
      setError(errorMessage);
    } finally {
      setIsIngesting(false);
      setProcessingStatus("");
    }
  };

  // Add processing status state for better user feedback
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
    setProcessingStatus(""); // Clear processing status
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
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Enhanced Document Ingestion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source Input Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Source</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="url" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    File Upload
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Manual Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <Label htmlFor="url">Document URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/regulation.pdf"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        detectMetadataFromUrl(e.target.value);
                      }}
                      disabled={isIngesting}
                    />
                  </div>

                  {/* Quick URL suggestions */}
                  <div>
                    <Label>Quick Access</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
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

                  {/* Detected metadata */}
                  {detectedMetadata && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium">Auto-detected:</div>
                        <div className="text-sm mt-1">
                          {detectedMetadata.suggested_title} • {detectedMetadata.regulator} • 
                          Confidence: {Math.round(detectedMetadata.confidence_score * 100)}%
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <div>
                    <Label htmlFor="file">Upload Document</Label>
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".txt,.pdf,.html,.htm,.doc,.docx"
                      disabled={isIngesting}
                    />
                    {uploadedFile && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{uploadedFile.name}</span>
                          <span className="text-gray-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        {uploadedFile.size > 5 * 1024 * 1024 && (
                          <div className="text-orange-600 text-xs mt-1">
                            ⚠️ Large file - processing may take longer
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="manual-text">Paste Document Text</Label>
                    <Textarea
                      id="manual-text"
                      placeholder="Paste your regulatory text here..."
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      rows={10}
                      disabled={isIngesting}
                    />
                    {manualText && (
                      <div className="text-sm text-gray-500 mt-1">
                        {manualText.length} characters • {Math.ceil(manualText.length / 2000)} estimated chunks
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Regulation Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regulation Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-new"
                  checked={createNewReg}
                  onCheckedChange={(checked) => setCreateNewReg(checked as boolean)}
                  disabled={isIngesting}
                />
                <Label htmlFor="create-new">Create new regulation</Label>
              </div>

              {!createNewReg && (
                <div>
                  <Label htmlFor="regulation">Select Existing Regulation</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-title">Regulation Title *</Label>
                    <Input
                      id="new-title"
                      value={newRegTitle}
                      onChange={(e) => setNewRegTitle(e.target.value)}
                      placeholder="Basel III Capital Requirements"
                      disabled={isIngesting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-code">Short Code *</Label>
                    <Input
                      id="new-code"
                      value={newRegShortCode}
                      onChange={(e) => setNewRegShortCode(e.target.value)}
                      placeholder="BASEL_III"
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
                        <SelectItem value="GLOBAL">Global/International</SelectItem>
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
                        <SelectItem value="ECB">ECB</SelectItem>
                        <SelectItem value="Fed">Federal Reserve</SelectItem>
                        <SelectItem value="BCBS">Basel Committee</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
              <CardTitle className="text-base">Document Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="version">Version Label</Label>
                  <Input
                    id="version"
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    placeholder="v1.0 or 2024-01"
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

          {/* Processing Status */}
          {isIngesting && processingStatus && (
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription className="font-medium">
                {processingStatus}
              </AlertDescription>
            </Alert>
          )}

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
