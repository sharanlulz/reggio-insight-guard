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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestComplete: () => void;
}

interface RegulationOption {
  id: string;
  name: string;
  regulator: string;
  jurisdiction: string;
}

interface AutoDetectedMetadata {
  title?: string;
  publication_date?: string;
  version?: string;
  document_type?: 'regulation' | 'guidance' | 'consultation' | 'policy';
  regulator?: string;
  jurisdiction?: string;
  regulation_id?: string;
  confidence_score?: number;
}

const QUICK_URLS = [
  {
    name: "PRA Rulebook - Liquidity",
    url: "https://www.prarulebook.co.uk/rulebook/Content/Part/211138/22-12-2022",
    regulation_id: "PRA_LIQ",
    regulator: "PRA",
    jurisdiction: "UK"
  },
  {
    name: "PRA110 Instructions",
    url: "https://www.bankofengland.co.uk/prudential-regulation/regulatory-reporting/regulatory-reporting-banking-sector/liquidity",
    regulation_id: "PRA110",
    regulator: "PRA", 
    jurisdiction: "UK"
  },
  {
    name: "FCA Handbook - PRIN",
    url: "https://www.handbook.fca.org.uk/handbook/PRIN.pdf",
    regulation_id: "FCA_PRIN",
    regulator: "FCA",
    jurisdiction: "UK"
  },
  {
    name: "EBA CRR Guidelines",
    url: "https://www.eba.europa.eu/regulation-and-policy/capital-requirements-regulation-crr",
    regulation_id: "EBA_CRR",
    regulator: "EBA",
    jurisdiction: "EU"
  }
];

const DOCUMENT_TYPES = [
  { value: 'regulation', label: 'Regulation' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'consultation', label: 'Consultation Paper' },
  { value: 'policy', label: 'Policy Statement' }
];

export function IngestModal({ isOpen, onClose, onIngestComplete }: IngestModalProps) {
  // Form state
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  const [selectedRegulation, setSelectedRegulation] = useState("");
  const [newRegulationName, setNewRegulationName] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [regulator, setRegulator] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [documentType, setDocumentType] = useState<'regulation' | 'guidance' | 'consultation' | 'policy'>('regulation');
  const [language, setLanguage] = useState("en");
  const [publishedDate, setPublishedDate] = useState("");
  const [version, setVersion] = useState("");

  // UI state
  const [regulations, setRegulations] = useState<RegulationOption[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [urlPreview, setUrlPreview] = useState<AutoDetectedMetadata | null>(null);
  const [error, setError] = useState("");
  const [createNewRegulation, setCreateNewRegulation] = useState(false);

  // Load existing regulations
  useEffect(() => {
    if (isOpen) {
      loadRegulations();
    }
  }, [isOpen]);

  const loadRegulations = async () => {
    try {
      const { data, error } = await supabase
        .from('regulations')
        .select('id, name, regulator, jurisdiction')
        .order('name');

      if (error) throw error;
      setRegulations(data || []);
    } catch (err) {
      console.error('Error loading regulations:', err);
    }
  };

  const detectMetadata = async (inputUrl: string) => {
    if (!inputUrl) return;

    setIsDetecting(true);
    setError("");

    try {
      const response = await supabase.functions.invoke('reggio-detect-metadata', {
        body: { url: inputUrl }
      });

      if (response.error) throw response.error;

      const metadata: AutoDetectedMetadata = response.data;
      setUrlPreview(metadata);

      // Auto-populate form fields with detected data
      if (metadata.title && !newRegulationName) {
        setNewRegulationName(metadata.title);
      }
      if (metadata.regulation_id && !regulationId) {
        setRegulationId(metadata.regulation_id);
      }
      if (metadata.regulator && !regulator) {
        setRegulator(metadata.regulator);
      }
      if (metadata.jurisdiction && !jurisdiction) {
        setJurisdiction(metadata.jurisdiction);
      }
      if (metadata.publication_date && !publishedDate) {
        setPublishedDate(metadata.publication_date);
      }
      if (metadata.version && !version) {
        setVersion(metadata.version);
      }
      if (metadata.document_type) {
        setDocumentType(metadata.document_type);
      }

      // Check if this regulation already exists
      const existingReg = regulations.find(r => 
        r.id.toLowerCase().includes(metadata.regulation_id?.toLowerCase() || '') ||
        r.name.toLowerCase().includes(metadata.title?.toLowerCase() || '')
      );

      if (existingReg) {
        setSelectedRegulation(existingReg.id);
        setCreateNewRegulation(false);
        
        // If existing regulation found, increment version
        if (metadata.version) {
          const versionNum = parseFloat(metadata.version);
          if (!isNaN(versionNum)) {
            setVersion((versionNum + 0.1).toFixed(1));
          }
        }
      } else {
        setCreateNewRegulation(true);
      }

    } catch (err: any) {
      setError(`Failed to detect metadata: ${err.message}`);
      setUrlPreview(null);
    } finally {
      setIsDetecting(false);
    }
  };

  // Auto-detect when URL changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (url && isValidUrl(url)) {
        detectMetadata(url);
      } else {
        setUrlPreview(null);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [url]);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleQuickUrl = (quickUrl: any) => {
    setUrl(quickUrl.url);
    setRegulationId(quickUrl.regulation_id);
    setRegulator(quickUrl.regulator);
    setJurisdiction(quickUrl.jurisdiction);
    setCreateNewRegulation(true);
  };

  const handleIngest = async () => {
    setIsIngesting(true);
    setError("");

    try {
      let regulationToUse = selectedRegulation;

      // Create new regulation if needed
      if (createNewRegulation || !selectedRegulation) {
        if (!newRegulationName) {
          throw new Error("Please provide a regulation name");
        }

        const { data: newReg, error: regError } = await supabase
          .from('regulations')
          .insert({
            name: newRegulationName,
            regulation_id: regulationId,
            regulator,
            jurisdiction,
            document_type: documentType,
            language
          })
          .select()
          .single();

        if (regError) throw regError;
        regulationToUse = newReg.id;
      }

      // Prepare ingestion payload
      let payload: any = {
        regulation_id: regulationToUse,
        document_type: documentType,
        language,
        published_date: publishedDate,
        version: version || "1.0",
        source_url: activeTab === "url" ? url : null
      };

      if (activeTab === "url") {
        payload.url = url;
      } else if (activeTab === "file") {
        if (!file) throw new Error("Please select a file");
        
        // Convert file to base64
        const reader = new FileReader();
        const fileContent = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        payload.file_content = fileContent;
        payload.file_name = file.name;
      } else if (activeTab === "text") {
        if (!manualText) throw new Error("Please provide text content");
        payload.text_content = manualText;
      }

      // Call ingestion function
      const response = await supabase.functions.invoke('reggio-ingest', {
        body: payload
      });

      console.log('Ingestion response:', response);

      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw new Error(response.error.message || JSON.stringify(response.error));
      }

      if (!response.data || response.data.error) {
        const errorMsg = response.data?.error || response.data?.message || 'Unknown ingestion error';
        console.error('Function returned error:', errorMsg);
        throw new Error(errorMsg);
      }

      onIngestComplete();
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Ingestion error details:', err);
      
      let errorMessage = 'Ingestion failed';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.error) {
        errorMessage = err.error.message || JSON.stringify(err.error);
      } else {
        errorMessage = JSON.stringify(err);
      }
      
      setError(errorMessage);
    } finally {
      setIsIngesting(false);
    }
  };

  const resetForm = () => {
    setUrl("");
    setFile(null);
    setManualText("");
    setSelectedRegulation("");
    setNewRegulationName("");
    setRegulationId("");
    setRegulator("");
    setJurisdiction("");
    setDocumentType('regulation');
    setLanguage("en");
    setPublishedDate("");
    setVersion("");
    setCreateNewRegulation(false);
    setUrlPreview(null);
    setError("");
  };

  const canSubmit = () => {
    const hasInput = (activeTab === "url" && url) || 
                     (activeTab === "file" && file) || 
                     (activeTab === "text" && manualText);
    
    const hasRegulation = selectedRegulation || (createNewRegulation && newRegulationName);
    
    return hasInput && hasRegulation && !isIngesting && !isDetecting;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart Regulatory Document Ingestion</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Method Selection */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url">URL (Recommended)</TabsTrigger>
              <TabsTrigger value="file">File Upload</TabsTrigger>
              <TabsTrigger value="text">Manual Text</TabsTrigger>
            </TabsList>

            {/* URL Tab */}
            <TabsContent value="url" className="space-y-4">
              <div>
                <Label htmlFor="url">Document URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.prarulebook.co.uk/..."
                    className="flex-1"
                  />
                  {isDetecting && (
                    <Button disabled size="icon">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                  )}
                  {url && isValidUrl(url) && !isDetecting && (
                    <Button 
                      onClick={() => detectMetadata(url)} 
                      size="icon" 
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick Access URLs */}
              <div>
                <Label>Quick Access (Common Regulatory Sources)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {QUICK_URLS.map((quick, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickUrl(quick)}
                      className="justify-start text-left h-auto p-3"
                    >
                      <div>
                        <div className="font-medium text-sm">{quick.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {quick.regulator} • {quick.jurisdiction}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* URL Preview */}
              {urlPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Auto-Detected Metadata
                    </CardTitle>
                    <CardDescription>
                      Confidence: {((urlPreview.confidence_score || 0) * 100).toFixed(0)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Title:</strong> {urlPreview.title}</div>
                      <div><strong>Type:</strong> {urlPreview.document_type}</div>
                      <div><strong>Regulator:</strong> {urlPreview.regulator}</div>
                      <div><strong>Jurisdiction:</strong> {urlPreview.jurisdiction}</div>
                      <div><strong>Published:</strong> {urlPreview.publication_date}</div>
                      <div><strong>Version:</strong> {urlPreview.version}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* File Tab */}
            <TabsContent value="file" className="space-y-4">
              <div>
                <Label htmlFor="file">Select Document File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.docx,.doc,.txt,.html"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: PDF, DOCX, DOC, TXT, HTML
                </p>
              </div>
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="space-y-4">
              <div>
                <Label htmlFor="text">Regulatory Text</Label>
                <Textarea
                  id="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste regulatory text here..."
                  rows={6}
                  className="mt-1"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Regulation Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Regulation Assignment</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateNewRegulation(!createNewRegulation)}
              >
                {createNewRegulation ? "Select Existing" : "Create New"}
              </Button>
            </div>

            {createNewRegulation ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reg-name">Regulation Name *</Label>
                  <Input
                    id="reg-name"
                    value={newRegulationName}
                    onChange={(e) => setNewRegulationName(e.target.value)}
                    placeholder="e.g., PRA Liquidity Rules"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-id">Regulation ID</Label>
                  <Input
                    id="reg-id"
                    value={regulationId}
                    onChange={(e) => setRegulationId(e.target.value)}
                    placeholder="e.g., PRA_LIQ"
                  />
                </div>
                <div>
                  <Label htmlFor="regulator">Regulator</Label>
                  <Input
                    id="regulator"
                    value={regulator}
                    onChange={(e) => setRegulator(e.target.value)}
                    placeholder="e.g., PRA, FCA, EBA"
                  />
                </div>
                <div>
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Input
                    id="jurisdiction"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="e.g., UK, EU, US"
                  />
                </div>
              </div>
            ) : (
              <Select value={selectedRegulation} onValueChange={setSelectedRegulation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select existing regulation..." />
                </SelectTrigger>
                <SelectContent>
                  {regulations.map((reg) => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.name} ({reg.regulator} • {reg.jurisdiction})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Document Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doc-type">Document Type</Label>
              <Select value={documentType} onValueChange={(value: any) => setDocumentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pub-date">Published Date</Label>
              <Input
                id="pub-date"
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., 1.0, 2.1"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isIngesting}>
              Cancel
            </Button>
            <Button 
              onClick={handleIngest} 
              disabled={!canSubmit()}
            >
              {isIngesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Start Ingestion'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
