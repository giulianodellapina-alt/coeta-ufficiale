import React from "react";
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2 
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DocumentsBachecaTabProps {
  documents: any[];
}

export const DocumentsBachecaTab: React.FC<DocumentsBachecaTabProps> = ({
  documents,
}) => {
  return (
    
                      <div className="space-y-6">
                        <h2 className="text-2xl font-normal flex items-center gap-2 text-white">
                          <FileText className="h-6 w-6 text-blue-400 mr-2" />
                          Bacheca Documenti
                        </h2>
                        <div className="flex gap-4 items-end bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                          <div className="flex-1 space-y-2">
                            <Label className="text-slate-400">
                              Titolo Documento
                            </Label>
                            <Input
                              placeholder="Es: Regolamento 2024..."
                              className="bg-slate-950 border-slate-700"
                            />
                          </div>
                          <Button className="bg-blue-600">
                            <Upload className="h-4 w-4 mr-2" /> Carica PDF
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {documents.map((doc, idx) => (
                            <Card
                              key={`${doc.id}_${idx}`}
                              className="bg-slate-900/50 border-slate-800"
                            >
                              <CardHeader>
                                <CardTitle className="text-sm font-normal text-white uppercase tracking-wider">
                                  {doc.title}
                                </CardTitle>
                                <CardDescription className="text-[10px] text-slate-500">
                                  {format(doc.createdAt.toDate(), "dd/MM/yyyy")}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="flex justify-between items-center">
                                <Button
                                  variant="ghost"
                                  className="text-blue-400 hover:text-white hover:bg-blue-600 h-8 px-3 text-xs"
                                >
                                  <Download className="h-3 w-3 mr-2" /> Scarica
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="text-red-400 hover:bg-red-900/20 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    
  );
};
