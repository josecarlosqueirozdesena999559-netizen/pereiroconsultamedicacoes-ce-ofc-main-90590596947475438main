import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Pill, Phone, MapPin as LocationIcon, Clock, FileText, Users } from 'lucide-react';
import Header from '@/components/Header';

const MedicacoesAutoCusto = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary via-[hsl(120_75%_25%)] to-primary text-primary-foreground py-8 sm:py-16">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <Pill className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 sm:mb-6 opacity-90" />
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-3 sm:mb-6">
            Medicações Auto Custo
          </h1>
          <p className="text-base sm:text-xl md:text-2xl opacity-95 mb-2 sm:mb-4 font-medium">
            CAF - CENTRAL DE ABASTECIMENTO FARMACÊUTICO.
          </p>
          <p className="text-xs sm:text-lg opacity-85 max-w-4xl mx-auto leading-relaxed px-2 sm:px-4 mb-4 sm:mb-6">
            Acesso a medicamentos indicados para o tratamento de condições clínicas de maior complexidade,
            tais como: doenças raras, doenças autoimunes, esclerose múltipla, artrite reumatoide,
            doenças inflamatórias intestinais, psoríase em formas graves, pacientes transplantados, entre outras.
          </p>

          {/* ✅ Botões de download centralizados */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-4 sm:mt-6 px-2">
            <a
              href="/condicoes-clinicas-contempladas-pelo-ceaf.pdf"
              download
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-white text-primary font-semibold rounded-lg shadow hover:bg-gray-100 transition-colors text-xs sm:text-base"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-left">Condições clínicas contempladas</span>
            </a>

            <a
              href="/lista-de-medicamentos-disponibilizados-pelo-ceaf.pdf"
              download
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-white text-primary font-semibold rounded-lg shadow hover:bg-gray-100 transition-colors text-xs sm:text-base"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-left">Elenco de medicamentos disponibilizados</span>
            </a>
          </div>
        </div>
      </section>

      {/* Information Section */}
      <section className="py-6 sm:py-12 -mt-4 sm:-mt-12">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white shadow-xl border-2 border-primary/10">
              <CardContent className="p-4 sm:p-8">

                <Accordion
                  type="multiple"
                  defaultValue={['o-que-e', 'como-funciona', 'caf-info']}
                  className="w-full space-y-4"
                >
                  <AccordionItem value="o-que-e" className="border border-primary/20 rounded-lg px-3 sm:px-6">
                    <AccordionTrigger className="text-base sm:text-lg font-semibold text-primary hover:no-underline py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span>O que é?</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-4 sm:pt-4 sm:pb-6">
                      <div className="space-y-3 sm:space-y-4">
                        <p className="text-muted-foreground leading-relaxed text-xs sm:text-base">
                          O Governo Federal, através do Sistema Único de Saúde (SUS), fornece medicamentos de alto custo para doenças graves, crônicas e raras,
                          principalmente através do Componente Especializado da Assistência Farmacêutica (CEAF).
                          Para ter acesso, é preciso ter o laudo médico (LME), a receita, os documentos pessoais e o cartão SUS,
                          e verificar se o medicamento está nos protocolos clínicos do Ministério da Saúde.
                          A solicitação é feita nas Secretarias de Saúde ou através do portal do Ministério da Saúde.
                        </p>
                        <div className="p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-xs sm:text-sm font-medium text-primary">
                            <strong>Objetivo:</strong> "Garantir o acesso a medicamentos essenciais para todas as famílias."
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="como-funciona" className="border border-success/20 rounded-lg px-3 sm:px-6">
                    <AccordionTrigger className="text-base sm:text-lg font-semibold text-success hover:no-underline py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span>Como ter acesso aos medicamentos?</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-4 sm:pt-4 sm:pb-6">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-2 sm:space-y-3">
                          <p className="text-muted-foreground leading-relaxed text-xs sm:text-base">
                            Após o atendimento médico e a prescrição de um medicamento pertencente ao elenco do CEAF (Elenco de medicamentos disponibilizados), o(a) usuário(a) deverá sair da consulta com os seguintes documentos devidamente preenchidos pelo profissional prescritor:
                          </p>
                          <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-xs sm:text-sm text-muted-foreground">
                            <li>Cópia do Cartão Nacional de Saúde (CNS).</li>
                            <li>Cópia do documento de identidade com foto.</li>
                            <li>Laudo para Solicitação, Avaliação e Autorização de Medicamento do Componente Especializado da Assistência Farmacêutica (LME) preenchido por um médico.</li>
                            <li>Receita médica preenchida.</li>
                            <li>Cópia do comprovante de residência.</li>
                            <li>Exames e outros documentos adicionais, dependendo da doença.</li>
                          </ul>
                        </div>

                        <div className="mt-3 sm:mt-4 text-center">
                          <a
                            href="laudo.pdf"
                            download
                            className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 transition-colors text-xs sm:text-sm font-medium"
                          >
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                            Baixar Laudo (PDF)
                          </a>
                        </div>

                        <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2 sm:mt-3">
                          Em posse dessa documentação ou para maiores esclarecimentos dirija-se a Central de Abastecimento Farmacêutico, situada a Rua Santos Dumont,283, Centro.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="caf-info" className="border border-info/20 rounded-lg px-3 sm:px-6">
                    <AccordionTrigger className="text-base sm:text-lg font-semibold text-info hover:no-underline py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <LocationIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span>Mais informações - CAF</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-4 sm:pt-4 sm:pb-6">
                      <div className="space-y-4 sm:space-y-6">
                        <div>
                          <h4 className="font-semibold text-info mb-3 sm:mb-4 text-sm sm:text-base">CENTRAL DE ABASTECIMENTO FARMACÊUTICO - CAF</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-3 sm:space-y-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <LocationIcon className="h-4 w-4 sm:h-5 sm:w-5 text-info mt-0.5 sm:mt-1 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-xs sm:text-base">Endereço:</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">Rua Santos Dumont - 283 Centro</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">Pereiro - CE, 63460-000</p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-start gap-2 sm:gap-3">
                                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-info mt-0.5 sm:mt-1 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-xs sm:text-base">Funcionamento:</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">Segunda à Sexta: 7h às 17h</p>
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
