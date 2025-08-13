// Enhanced Operator Dashboard with reliability features
// REPLACE ENTIRE CONTENTS of: src/pages/OperatorDashboard.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Play, Pause } from "lucide-react";
import IngestModal from "@/components/ingest/IngestModal";

type IngestRow = {
  id: string;
  regulation_document_id: string;
  status: "pending" | "running" | "paused" | "succeeded" | "failed";
  chunks_total: number;
  chunks_processed: number;
  chunks_succeeded: number;
  chunks_failed: number;
  retry_count: number;
  max
