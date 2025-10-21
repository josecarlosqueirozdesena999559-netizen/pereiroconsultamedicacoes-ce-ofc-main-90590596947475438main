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

const Index = () => {
  const [ubsList, setUbsList] = useState<UBS[]>([]);
  const [filteredUBS, setFilteredUBS] = useState<UBS[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
      <section className="bg-gradient-to-r from-primary via-[hsl(120_75%_25%)] to-primary text-primary-foreground py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 md:mb-6">
            Consulta de Medicamentos 
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-95 mb-2 sm:mb-3 md:mb-4 font-medium">
            Sistema Integrado de Saúde Pública 
          </p>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg opacity-85 max-w-4xl mx-auto leading-relaxed px-4">
            Acesse informações atualizadas sobre medicamentos disponíveis em todas as 
            Unidades Básicas de Saúde do município de Pereiro. Sistema oficial da 
            Prefeitura Municipal para garantir transparência e facilitar o acesso aos serviços de saúde.
          </p>
        </div>
      </section>


      {/* UBS Section */}
      <section className="py-6 sm:py-8 md:py-12 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-3 sm:mb-4 md:mb-6">
              Nossas Unidades Básicas de Saúde
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed px-4">
              Encontre a UBS mais próxima de você e acesse informações detalhadas sobre 
              horários, responsáveis e listas atualizadas de medicamentos disponíveis.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-lg mx-auto relative px-4">
              <Search className="absolute left-8 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 sm:h-5 w-4 sm:w-5" />
              <Input
                type="text"
                placeholder="Buscar UBS, localidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {filteredUBS.length === 0 ? (
            <Card className="max-w-md mx-auto mx-4">
              <CardContent className="p-4 sm:p-6 md:p-8 text-center">
                <MapPin className="h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 text-muted-foreground mx-auto mb-2 sm:mb-3 md:mb-4" />
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">Nenhuma UBS encontrada</h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  {searchTerm ? 'Tente ajustar sua busca' : 'Nenhuma UBS cadastrada no sistema'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {filteredUBS.map((ubs) => (
                <UBSCard key={ubs.id} ubs={ubs} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Card className="shadow-xl border-2 border-primary/10">
              <CardHeader className="text-center bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl md:text-3xl text-primary mb-2 sm:mb-4">Como Utilizar o Sistema</CardTitle>
                <CardDescription className="text-sm sm:text-base md:text-lg text-muted-foreground">
                  Processo simples e rápido para consultar medicamentos disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8 lg:p-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-primary to-[hsl(120_75%_25%)] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6 shadow-lg">
                      <span className="text-primary-foreground font-bold text-lg sm:text-xl md:text-2xl">1</span>
                    </div>
                    <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 text-primary">Localizar UBS</h3>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                      Encontre a unidade de saúde mais próxima usando nossa busca 
                      por localidade ou nome da UBS
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-primary to-[hsl(120_75%_25%)] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6 shadow-lg">
                      <span className="text-primary-foreground font-bold text-lg sm:text-xl md:text-2xl">2</span>
                    </div>
                    <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 text-primary">Acessar Lista</h3>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                      Baixe o PDF atualizado clicando no botão de download ou 
                      escaneie o QR Code com seu smartphone
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-primary to-[hsl(120_75%_25%)] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6 shadow-lg">
                      <span className="text-primary-foreground font-bold text-lg sm:text-xl md:text-2xl">3</span>
                    </div>
                    <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 text-primary">Consultar Medicamentos</h3>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                      Visualize a lista completa e sempre atualizada de todos os 
                      medicamentos disponíveis na unidade escolhida
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 sm:mt-8 md:mt-12 text-center p-3 sm:p-4 md:p-6 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-semibold text-primary mb-1 sm:mb-2 text-sm sm:text-base">Informação Importante</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    As listas são atualizadas regularmente pelas equipes das UBS. 
                    Recomendamos sempre verificar a data da última atualização antes de se dirigir à unidade.
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
