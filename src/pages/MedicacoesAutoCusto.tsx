import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Pill, Phone, MapPin as LocationIcon, Clock, FileText, Users } from 'lucide-react';
import Header from '@/components/Header';
import { useIsMobile } from '@/hooks/use-mobile';

const MedicacoesAutoCusto = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary via-[hsl(120_75%_25%)] to-primary text-primary-foreground py-6 sm:py-8 md:py-12">
        <div className="container mx-auto px-3 text-center">
          <Pill className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-3 sm:mb-4 opacity-90" />
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3">
            Medicamentos Alto Custo
          </h1>
          <p className="text-xs sm:text-sm md:text-base font-medium mb-2 sm:mb-3 px-2">
            CAF - CENTRAL DE ABASTECIMENTO FARMACÊUTICO
          </p>
          <p className="text-[0.6rem] sm:text-xs md:text-sm opacity-85 max-w-4xl mx-auto leading-relaxed px-2 mb-3 sm:mb-4">
            Acesso a medicamentos indicados para o tratamento de condições clínicas de maior complexidade, tais como: doenças raras, doenças autoimunes, esclerose múltipla, artrite reumatoide, doenças inflamatórias intestinais, psoríase em formas graves, pacientes transplantados, entre outras.
          </p>
          
          {/* Botões de download centralizados */}
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 px-2">
            <a 
              href="/condicoes-clinicas-contempladas-pelo-ceaf.pdf" 
              download 
              className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-white text-primary font-semibold rounded-lg shadow hover:bg-gray-100 transition-colors text-[0.6rem] sm:text-xs"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-left">Condições clínicas contempladas</span>
            </a>
            <a 
              href="/lista-de-medicamentos-disponibilizados-pelo-ceaf.pdf" 
              download 
              className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-white text-primary font-semibold rounded-lg shadow hover:bg-gray-100 transition-colors text-[0.6rem] sm:text-xs"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-left">Elenco de medicamentos disponibilizados</span>
            </a>
          </div>
        </div>
      </section>

      {/* Information Section */}
      <section className="py-4 sm:py-6 -mt-2 sm:-mt-3">
        <div className="container mx-auto px-3">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white shadow-lg border border-primary/10">
              <CardContent className="p-3 sm:p-4">
                <Accordion type="multiple" defaultValue={['o-que-e', 'como-funciona', 'caf-info']} className="w-full space-y-2 sm:space-y-3">
                  <AccordionItem value="o-que-e" className="border border-primary/20 rounded-lg px-2 sm:px-4">
                    <AccordionTrigger className="text-xs sm:text-sm font-semibold text-primary hover:no-underline py-2 sm:py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>O que é?</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 sm:pt-3 sm:pb-4">
                      <div className="space-y-2">
                        <p className="text-muted-foreground leading-relaxed text-[0.6rem] sm:text-xs">
                          O Governo Federal, através do Sistema Único de Saúde (SUS), fornece medicamentos de alto custo para doenças graves, crônicas e raras, principalmente através do Componente Especializado da Assistência Farmacêutica (CEAF). Para ter acesso, é preciso ter o laudo médico (LME), a receita, os documentos pessoais e o cartão SUS, e verificar se o medicamento está nos protocolos clínicos do Ministério da Saúde. A solicitação é feita nas Secretarias de Saúde ou através do portal do Ministério da Saúde.
                        </p>
                        <div className="p-2 sm:p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-[0.6rem] sm:text-xs font-medium text-primary">
                            <strong>Objetivo:</strong> "Garantir o acesso a medicamentos essenciais para todas as famílias."
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="como-funciona" className="border border-success/20 rounded-lg px-2 sm:px-4">
                    <AccordionTrigger className="text-xs sm:text-sm font-semibold text-success hover:no-underline py-2 sm:py-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>Como ter acesso aos medicamentos?</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 sm:pt-3 sm:pb-4">
                      <div className="space-y-2">
                        <div className="space-y-2">
                          <p className="text-muted-foreground leading-relaxed text-[0.6rem] sm:text-xs">
                            Após o atendimento médico e a prescrição de um medicamento pertencente ao elenco do CEAF (Elenco de medicamentos disponibilizados), o(a) usuário(a) deverá sair da consulta com os seguintes documentos devidamente preenchidos pelo profissional prescritor:
                          </p>
                          <ul className="list-disc pl-3 sm:pl-4 space-y-1 text-[0.6rem] sm:text-xs text-muted-foreground">
                            <li>Cópia do Cartão Nacional de Saúde (CNS).</li>
                            <li>Cópia do documento de identidade com foto.</li>
                            <li>Laudo para Solicitação, Avaliação e Autorização de Medicamento do Componente Especializado da Assistência Farmacêutica (LME) preenchido por um médico.</li>
                            <li>Receita médica preenchida.</li>
                            <li>Cópia do comprovante de residência.</li>
                            <li>Exames e outros documentos adicionais, dependendo da doença.</li>
                          </ul>
                        </div>
                        <div className="mt-2 text-center">
                          <a 
                            href="laudo.pdf" 
                            download 
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-success text-white rounded-md hover:bg-success/90 transition-colors text-[0.6rem] sm:text-xs font-medium"
                          >
                            <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Baixar Laudo (PDF)
                          </a>
                        </div>
                        <p className="text-[0.6rem] sm:text-xs text-muted-foreground text-center mt-2">
                          Em posse dessa documentação ou para maiores esclarecimentos dirija-se a Central de Abastecimento Farmacêutico, situada a Rua Santos Dumont,283, Centro.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="caf-info" className="border border-info/20 rounded-lg px-2 sm:px-4">
                    <AccordionTrigger className="text-xs sm:text-sm font-semibold text-info hover:no-underline py-2 sm:py-3">
                      <div className="flex items-center gap-2">
                        <LocationIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>Mais informações - CAF</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 sm:pt-3 sm:pb-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-info mb-2 sm:mb-3 text-xs sm:text-sm">CENTRAL DE ABASTECIMENTO FARMACÊUTICO - CAF</h4>
                          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <LocationIcon className="h-3 w-3 sm:h-4 sm:w-4 text-info mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-xs sm:text-sm">Endereço:</p>
                                  <p className="text-[0.6rem] sm:text-xs text-muted-foreground">Rua Santos Dumont - 283 Centro</p>
                                  <p className="text-[0.6rem] sm:text-xs text-muted-foreground">Pereiro - CE, 63460-000</p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-start gap-2">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-info mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-xs sm:text-sm">Funcionamento:</p>
                                  <p className="text-[0.6rem] sm:text-xs text-muted-foreground">Segunda à Sexta: 7h às 17h</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MedicacoesAutoCusto;