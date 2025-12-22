import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MapPin, ChevronDown, Pill, Phone, MapPin as LocationIcon } from 'lucide-react';
import Header from '@/components/Header';
import UBSCard from '@/components/UBSCard';
import { UBS } from '@/types';
import { getUBS, initializeStorage } from '@/lib/storage';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [ubsList, setUbsList] = useState<UBS[]>([]);
  const [filteredUBS, setFilteredUBS] = useState<UBS[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    initializeStorage();
    loadUBS();
  }, []);

  useEffect(() => {
    filterUBS();
  }, [ubsList, searchTerm]);

  const loadUBS = async () => {
    try {
      const data = await getUBS();
      setUbsList(data);
    } catch (error) {
      console.error('Erro ao carregar UBS:', error);
    }
  };

  const filterUBS = () => {
    if (!searchTerm.trim()) {
      setFilteredUBS(ubsList);
      return;
    }

    const filtered = ubsList.filter(ubs =>
      ubs.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ubs.localidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ubs.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUBS(filtered);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary via-[hsl(120_75%_25%)] to-primary text-primary-foreground py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
            Consulta de Medicamentos
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-95 mb-2 sm:mb-3 font-medium">
            Sistema Integrado de Saúde Pública
          </p>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg opacity-85 max-w-4xl mx-auto leading-relaxed px-2 sm:px-4">
            Acesse informações atualizadas sobre medicamentos disponíveis em todas as Unidades Básicas de Saúde do município de Pereiro. Sistema oficial da Prefeitura Municipal para garantir transparência e facilitar o acesso aos serviços de saúde.
          </p>
        </div>
      </section>

      {/* UBS Section */}
      <section className="py-6 sm:py-8 md:py-12 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-3 sm:mb-4">
              Nossas Unidades Básicas de Saúde
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-4 sm:mb-6 leading-relaxed px-2 sm:px-4">
              Encontre a UBS mais próxima de você e acesse informações detalhadas sobre horários, responsáveis e listas atualizadas de medicamentos disponíveis.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-lg mx-auto relative px-2 sm:px-4">
              <Search className="absolute left-4 sm:left-6 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />
              <Input
                type="text"
                placeholder="Buscar UBS, localidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:pl-12 py-2 sm:py-3 text-sm border-2 border-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {filteredUBS.length === 0 ? (
            <Card className="max-w-md mx-auto mx-4">
              <CardContent className="p-4 sm:p-6 text-center">
                <MapPin className="h-8 sm:h-10 w-8 sm:w-10 text-muted-foreground mx-auto mb-2 sm:mb-3" />
                <h3 className="text-sm sm:text-base font-semibold mb-2">Nenhuma UBS encontrada</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {searchTerm ? 'Tente ajustar sua busca' : 'Nenhuma UBS cadastrada no sistema'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-4 sm:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredUBS.map((ubs) => (
                <UBSCard key={ubs.id} ubs={ubs} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-6 sm:py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Card className="shadow-lg border border-primary/10">
              <CardHeader className="text-center bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl md:text-2xl text-primary mb-2">
                  Como Utilizar o Sistema
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  Processo simples e rápido para consultar medicamentos disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className={`grid gap-4 sm:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-gradient-to-r from-primary to-[hsl(120_75%_25%)] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-base sm:text-lg">1</span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base mb-2 text-primary">Localizar UBS</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Encontre a unidade de saúde mais próxima usando nossa busca por localidade ou nome da UBS
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-gradient-to-r from-primary to-[hsl(120_75%_25%)] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-base sm:text-lg">2</span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base mb-2 text-primary">Acessar Lista</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Baixe o PDF atualizado clicando no botão de download ou escaneie o QR Code com seu smartphone
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-gradient-to-r from-primary to-[hsl(120_75%_25%)] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-base sm:text-lg">3</span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base mb-2 text-primary">Consultar Medicamentos</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Visualize a lista completa e sempre atualizada de todos os medicamentos disponíveis na unidade escolhida
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-6 text-center p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-semibold text-primary mb-1 text-sm">Informação Importante</h4>
                  <p className="text-xs text-muted-foreground">
                    As listas são atualizadas regularmente pelas equipes das UBS. Recomendamos sempre verificar a data da última atualização antes de se dirigir à unidade.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;