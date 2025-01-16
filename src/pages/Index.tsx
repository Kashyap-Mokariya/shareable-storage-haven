import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@supabase/supabase-js";

interface FileRecord {
  id: string;
  filename: string;
  public_url: string;
  type: string;
  extension: string;
  shared_with: string[];
  fullname: string;
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    };

    checkUser();
    fetchFiles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching files",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setFiles(data || []);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("files")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("files").insert({
        filename: selectedFile.name,
        public_url: publicUrl,
        user_id: user.id,
        type: selectedFile.type,
        extension: fileExt || "",
        fullname: user.email || "Unknown",
      });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      setSelectedFile(null);
      fetchFiles();
    } catch (error: any) {
      toast({
        title: "Error uploading file",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedFileId || !shareEmail) return;

    try {
      const { error } = await supabase
        .from("files")
        .update({
          shared_with: supabase.sql`array_append(shared_with, ${shareEmail})`,
        })
        .eq("id", selectedFileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `File shared with ${shareEmail}`,
      });

      setShareEmail("");
      setSelectedFileId(null);
      fetchFiles();
    } catch (error: any) {
      toast({
        title: "Error sharing file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">FileShare</h1>
        <Button onClick={handleSignOut} variant="outline">
          Sign Out
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            type="file"
            onChange={handleFileChange}
            className="max-w-md"
          />
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        {selectedFileId && (
          <div className="flex gap-4">
            <Input
              type="email"
              placeholder="Enter email to share with"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={handleShare}>
              Share
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Shared With</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <a 
                    href={file.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {file.filename}
                  </a>
                </TableCell>
                <TableCell>{file.type}</TableCell>
                <TableCell>
                  {file.shared_with?.join(", ") || "Not shared"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFileId(file.id)}
                  >
                    Share
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Index;