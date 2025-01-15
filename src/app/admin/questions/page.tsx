'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Download, Pen, Pencil, Eye, CircleHelp, MessageCircleQuestion, Text, FolderPen, CloudUpload } from 'lucide-react'
import { parseQuestionXLSX } from '@/lib/xlsx-parser'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface QuestionBank {
  id: string
  title: string
  description: string | null
  created_at: string | null
  updated_at: string | null
}

export default function QuestionBankPage() {
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newBankTitle, setNewBankTitle] = useState('')
  const [newBankDescription, setNewBankDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchQuestionBanks = async () => {
      const { data, error } = await supabase
        .from('question_banks')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setQuestionBanks(data)
      }
      setIsLoading(false)
    }

    fetchQuestionBanks()
  }, [])

  const handleCreateBank = async () => {
    if (!newBankTitle.trim()) return

    try {
      setError(null);
      const { data: bankData, error: bankError } = await supabase
        .from('question_banks')
        .insert({
          title: newBankTitle,
          description: newBankDescription || null
        })
        .select()
        .single()

      if (bankError) throw bankError

      if (selectedFile) {
        try {
          const questions = await parseQuestionXLSX(selectedFile);
          
          // Insert questions
          for (const question of questions) {
            const questionData = {
              question_bank_id: bankData.id,
              question_text: question.question_text,
              question_type: question.question_type,
              no_of_times: question.no_of_times
            };

            // Add dynamic fields only if not static
            if (question.question_type !== 'static') {
              Object.assign(questionData, {
                template: question.template || '',
                variable_ranges: question.variable_ranges || {},
                option_generation_rules: question.option_generation_rules || {}
              });
            }

            // Insert the question
            const { data: insertedQuestion, error: questionError } = await supabase
              .from('questions')
              .insert(questionData)
              .select()
              .single();

            if (questionError) {
              console.error('Question insertion error:', questionError);
              throw questionError;
            }

            // For static questions, insert options
            if (question.question_type === 'static') {
              console.log('Inserting options:', question.options);
              const { error: optionsError } = await supabase
                .from('options')
                .insert(
                  question.options.map(opt => ({
                    question_id: insertedQuestion.id,
                    option_text: opt.option_text || '',
                    option_number: opt.option_number,
                    is_correct: !!opt.is_correct
                  }))
                );

              if (optionsError) {
                console.error('Options insertion error:', optionsError);
                throw optionsError;
              }
            }
          }
        } catch (error: any) {
          console.error('Error processing XLSX:', error);
          throw new Error('Failed to process question file: ' + error.message);
        }
      }

      setQuestionBanks([bankData, ...questionBanks])
      setNewBankTitle('')
      setNewBankDescription('')
      setSelectedFile(null)
      setIsCreateDialogOpen(false)
    } catch (error: any) {
      console.error('Error creating question bank:', error)
      setError(error.message)
    }
  }

  const handleViewQuestions = (bankId: string) => {
    router.push(`/admin/questions/${bankId}`)
  }

  const handleEditBank = (bankId: string) => {
    router.push(`/admin/questions/${bankId}/edit`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-start items-center">
        <h1 className="text-2xl font-bold flex items-center mt-4 mb-2"><CircleHelp className='mr-2'/> Question Banks</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <TooltipProvider>
            <Tooltip>
              <DialogTrigger asChild>
                <TooltipTrigger className="fixed right-6 bottom-6 lg:right-10 lg:bottom-10">
                  <Button className="rounded-full px-5 py-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
              </DialogTrigger>
              <TooltipContent className="lg:mt-8">
                 Create Question Bank
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className='flex items-center'><CircleHelp className='mr-2 w-5'/> Create Question Bank</DialogTitle>
              <DialogDescription>
                Create a new question bank and optionally import questions from
                an Excel file.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className='flex items-center'><FolderPen className='mr-1 w-4'/> Title</Label>
                <Input
                  id="title"
                  value={newBankTitle}
                  onChange={(e) => setNewBankTitle(e.target.value)}
                  placeholder="Enter bank title"
                />
              </div>
              <div>
                <Label htmlFor="description" className='flex items-center'><Text className='mr-1 w-4'/> Description</Label>
                <Textarea
                  id="description"
                  value={newBankDescription}
                  onChange={(e) => setNewBankDescription(e.target.value)}
                  placeholder="Enter bank description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor='file-upload' className='flex items-center'><CloudUpload className='mr-1 w-4'/> Questions File (Optional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id='file-upload'
                    type="file"
                    accept=".xlsx"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open("/templates/Adynamics Question Template.xlsx")
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Template
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Upload an Excel file with questions. Download the template to
                  see the required format.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setError(null);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBank}
                disabled={!newBankTitle.trim()}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {questionBanks.map((bank) => (
          <Card
            key={bank.id}
          >
            <CardHeader>
              <CardTitle>
                <h2 className="text-xl font-semibold flex items-center"><MessageCircleQuestion className='mr-2'/> {bank.title}</h2>
              </CardTitle>
              <CardDescription>
                {bank.description && (
                  <p className="text-gray-600 mt-2">{bank.description}</p>
                )}
              </CardDescription>
            </CardHeader>
            <CardFooter className='flex justify-end gap-3 mt-auto'>
              <Button
                variant="outline"
                onClick={() => handleViewQuestions(bank.id)}
              >
                <Eye className="mr-2 h-4 w-4" /> View Questions
              </Button>
              <Button variant="default" onClick={() => handleEditBank(bank.id)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {questionBanks.length === 0 && (
        <div className="text-center text-gray-500">
          No question banks found. Create one to get started.
        </div>
      )}
    </div>
  );
}
