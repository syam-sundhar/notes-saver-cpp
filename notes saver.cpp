// FILE-BASED NOTES SAVER

/*
Features:
1. Add Note
2. View Notes
3. Edit Note
4. Delete Note
5. Search Note
6. Exit
*/

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>

using namespace std;


// ==================== NOTE CLASS ====================

class Note
{
public:
    int id;
    string title;
    string content;

    // Default Constructor
    Note()
    {
        id = 0;
    }

    // Parameterized Constructor
    Note(int i, string t, string c)
    {
        id = i;
        title = t;
        content = c;
    }

    void display()
    {
        cout << "ID: " << id << endl;
        cout << "Title: " << title << endl;
        cout << "Content: " << content << endl;
        cout << "----------------------" << endl;
    }
};


class NotesManager
{
public:
    string fileName;

    // Constructor
    NotesManager(string file)
    {
        fileName = file;
    }


    void addNote()
    {
        string title;
        string content;

        cout << "\nEnter title: ";
        getline(cin, title);

        cout << "Enter content: ";
        getline(cin, content);


        // Open file to find the last ID
        ifstream file(fileName.c_str());

        int id = 1;
        int tempId;
        string line;

        while (getline(file, line))
        {
            stringstream ss(line);

            ss >> tempId;

            if (tempId >= id)
            {
                id = tempId + 1;
            }
        }

        file.close();


        // Open file in append mode
        ofstream outFile(fileName.c_str(), ios::app);

        outFile << id << "|" << title << "|" << content << endl;

        outFile.close();


        cout << "Note added successfully!" << endl;
        cout << "Note ID: " << id << endl;
    }


    void viewNotes()
    {
        ifstream file(fileName.c_str());

        if (!file)
        {
            cout << "\nNo notes found." << endl;
            return;
        }

        string line;
        bool found = false;

        cout << "\n===== YOUR NOTES =====" << endl;

        while (getline(file, line))
        {
            if (line == "")
            {
                continue;
            }

            stringstream ss(line);

            string idString;
            string title;
            string content;

            getline(ss, idString, '|');
            getline(ss, title, '|');
            getline(ss, content);


            cout << "ID: " << idString << endl;
            cout << "Title: " << title << endl;
            cout << "Content: " << content << endl;
            cout << "----------------------" << endl;

            found = true;
        }

        file.close();


        if (!found)
        {
            cout << "No notes found." << endl;
        }
    }
    void editNote()
    {
        int editId;
		cout << "\nEnter note ID to edit: ";
        cin >> editId;
        cin.ignore();
        ifstream file(fileName.c_str());
        if (!file)
        {
            cout << "No notes found." << endl;
            return;
        }
        ofstream tempFile("temp.txt");
        string line;
        bool found = false;
        while (getline(file, line))
        {
            stringstream ss(line);
            int id;
            ss >> id;
            if (id == editId)
            {
                found = true;
                string oldTitle;
                string oldContent;
                // Skip the | after ID
                ss.ignore();
                getline(ss, oldTitle, '|');
                getline(ss, oldContent);
                cout << "\nCurrent Title: " << oldTitle << endl;
                cout << "Current Content: " << oldContent << endl;
                string newTitle;
                string newContent;
                cout << "\nEnter new title: ";
                getline(cin, newTitle);
                cout << "Enter new content: ";
                getline(cin, newContent);
                // Write edited note
                tempFile << id << "|" << newTitle << "|" << newContent << endl;
            }
            else
            {
                // Copy unchanged note
                tempFile << line << endl;
            }
        }
        file.close();
        tempFile.close();
        remove(fileName.c_str());
        rename("temp.txt", fileName.c_str());
        if (found)
        {
            cout << "Note edited successfully!" << endl;
        }
        else
        {
            cout << "Note not found." << endl;
        }
    }



    void deleteNote()
    {
        int deleteId;

        cout << "\nEnter note ID to delete: ";
        cin >> deleteId;
        cin.ignore();


        ifstream file(fileName.c_str());

        if (!file)
        {
            cout << "No notes found." << endl;
            return;
        }


        ofstream tempFile("temp.txt");

        string line;

        bool found = false;


        while (getline(file, line))
        {
            stringstream ss(line);

            int id;

            ss >> id;


            if (id == deleteId)
            {
                found = true;

                continue;
            }


            tempFile << line << endl;
        }


        file.close();
        tempFile.close();


        // Replace old file with new file
        remove(fileName.c_str());
        rename("temp.txt", fileName.c_str());


        if (found)
        {
            cout << "Note deleted successfully!" << endl;
        }
        else
        {
            cout << "Note not found." << endl;
        }
    }


    void searchNote()
    {
        string searchText;
        cout << "\nEnter title or content to search: ";
        getline(cin, searchText);
        ifstream file(fileName.c_str());
        if (!file)
        {
            cout << "No notes found." << endl;
            return;
        }
        string line;
        bool found = false;
        cout << "\n===== SEARCH RESULTS =====" << endl;
        while (getline(file, line))
        {
            stringstream ss(line);
            string idString;
            string title;
            string content;
            getline(ss, idString, '|');
            getline(ss, title, '|');
            getline(ss, content);
            // Search in title or content
            if (title.find(searchText) != string::npos ||
                content.find(searchText) != string::npos)
            {
                cout << "ID: " << idString << endl;
                cout << "Title: " << title << endl;
                cout << "Content: " << content << endl;
                cout << "----------------------" << endl;

                found = true;
            }
        }
        file.close();
        if (!found)
        {
            cout << "No matching notes found." << endl;
        }
    }
};



class NotesApp
{
public:
    NotesManager manager;

    NotesApp(string file)
        : manager(file)
    {
    }


    void run()
    {
        int choice;


        cout << "\n============================" << endl;
        cout << "      FILE NOTES SAVER" << endl;


        do
        {
            cout << "============================" << endl;
            cout << endl;

            cout << "1. Add Note" << endl;
            cout << "2. View Notes" << endl;
            cout << "3. Edit Note" << endl;
            cout << "4. Delete Note" << endl;
            cout << "5. Search Note" << endl;
            cout << "6. Exit" << endl;

            cout << "Enter choice: ";
            cin >> choice;
            cin.ignore();


            switch (choice)
            {
                case 1:
                    manager.addNote();
                    break;


                case 2:
                    manager.viewNotes();
                    break;


                case 3:
                    manager.editNote();
                    break;


                case 4:
                    manager.deleteNote();
                    break;


                case 5:
                    manager.searchNote();
                    break;


                case 6:
                    cout << "Goodbye!" << endl;
                    break;


                default:
                    cout << "Invalid choice." << endl;
            }


        } while (choice != 6);
    }
};


// ==================== MAIN FUNCTION ====================

int main()
{
    NotesApp app("notes.txt");

    app.run();

    return 0;
}
