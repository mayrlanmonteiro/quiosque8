"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Store, User, Users, ShieldAlert, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ConfiguracoesClientProps {
  settings: any;
  profile: any;
  members: any[];
  tenantId: string;
  userRole: string;
  userId: string;
}

export function ConfiguracoesClient({ settings, profile, members, tenantId, userRole, userId }: ConfiguracoesClientProps) {
  const [storeName, setStoreName] = useState(settings?.store_name ?? "");
  const [lowStock, setLowStock] = useState(settings?.global_low_stock_threshold ?? 5);
  const [userName, setUserName] = useState(profile?.name ?? "");
  
  const [savingStore, setSavingStore] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  const supabase = createClient();
  const isAdmin = userRole === "admin";

  const handleSaveStore = async () => {
    if (!isAdmin) return;
    setSavingStore(true);
    const { error } = await supabase
      .from("tenant_settings")
      .update({ store_name: storeName, global_low_stock_threshold: lowStock })
      .eq("tenant_id", tenantId);
    
    setSavingStore(false);
    if (error) toast.error("Erro ao salvar", { description: error.message });
    else toast.success("Configurações da loja atualizadas");
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: userName })
      .eq("user_id", userId);
    
    setSavingProfile(false);
    if (error) toast.error("Erro ao salvar", { description: error.message });
    else toast.success("Perfil atualizado");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie as preferências da sua conta e da loja.</p>
      </div>

      <Tabs defaultValue="perfil" className="flex flex-col md:flex-row gap-6">
        <TabsList className="flex md:flex-col h-auto bg-transparent p-0 space-y-1 w-full md:w-48 overflow-x-auto border-b md:border-b-0 border-border pb-2 md:pb-0 justify-start">
          <TabsTrigger value="perfil" className="justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <User className="h-4 w-4" /> Perfil Pessoal
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="loja" className="justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
                <Store className="h-4 w-4" /> Dados da Loja
              </TabsTrigger>
              <TabsTrigger value="equipe" className="justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
                <Users className="h-4 w-4" /> Equipe e Acessos
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <div className="flex-1">
          <TabsContent value="perfil" className="m-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>Informações pessoais da sua conta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <Label>Nome</Label>
                  <Input value={userName} onChange={e => setUserName(e.target.value)} />
                </div>
                <div className="space-y-2 max-w-md">
                  <Label>Papel (Role)</Label>
                  <Input value={userRole} disabled className="capitalize" />
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <ShieldAlert className="h-3 w-3" /> Nível de acesso atribuído pelo administrador.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button onClick={handleSaveProfile} loading={savingProfile} className="gap-2">
                  <CheckCircle className="h-4 w-4" /> Salvar Perfil
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="loja" className="m-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações da Loja</CardTitle>
                    <CardDescription>Preferências globais do tenant.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 max-w-md">
                      <Label>Nome da Loja</Label>
                      <Input value={storeName} onChange={e => setStoreName(e.target.value)} />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <Label>Alerta de Estoque Baixo (Global)</Label>
                      <Input type="number" value={lowStock} onChange={e => setLowStock(Number(e.target.value))} />
                      <p className="text-xs text-muted-foreground mt-1">Quantidade padrão para disparar alerta caso o produto não tenha um limite específico.</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button onClick={handleSaveStore} loading={savingStore} className="gap-2">
                      <CheckCircle className="h-4 w-4" /> Salvar Configurações
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="equipe" className="m-0 space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Equipe</CardTitle>
                      <CardDescription>Usuários com acesso à loja.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" disabled title="Em breve">Convidar</Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              {m.profile?.name ?? "Usuário pendente"}
                              {m.profile?.user_id === userId && <Badge variant="outline" className="ml-2">Você</Badge>}
                            </TableCell>
                            <TableCell className="capitalize">{m.role}</TableCell>
                            <TableCell>
                              <Badge variant={m.active ? "success" : "secondary"}>
                                {m.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
