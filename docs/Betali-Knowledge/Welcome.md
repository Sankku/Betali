Para ver el video de un test fallido en el futuro:                                                                                                                    
  - Andá a la tab "Attachments" (visible en la parte inferior de la screenshot) → aparecerá video.webm si el test falló                                                 
  - O corrés pnpm pw:report para abrir el HTML report que incluye el video embebido                                                                                     
                                                                                                                                                                        
  El trace que ves en pw:ui es siempre completo (pass o fail) porque en modo UI siempre se captura. Para tests que pasan, el trace en pw:ui es suficiente para auditar  
  qué ocurrió — como la screenshot que muestra el modal "Create Lines From Order" con la row 800020 seleccionada correctamente.  